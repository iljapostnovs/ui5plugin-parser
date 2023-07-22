import { UI5JSParser } from "../../../../parser/UI5JSParser";
import ParserPool from "../../../../parser/pool/ParserPool";
import { ISyntaxAnalyser } from "../../jsparser/ISyntaxAnalyser";
import { StandardUIClass } from "../../ui5class/StandardUIClass";
import { CustomJSClass } from "../../ui5class/js/CustomJSClass";
import { NativeJSClass } from "../../ui5class/js/NativeJSClass";
import { IFragment, IView } from "../../util/filereader/IFileReader";
import { TextDocument } from "../../util/textdocument/TextDocument";
import {
	AbstractBaseClass,
	IUIAggregation,
	IUIAssociation,
	IUIEvent,
	IUIField,
	IUIMethod,
	IUIProperty
} from "../AbstractBaseClass";
import { AbstractCustomClass } from "../AbstractCustomClass";
import { EmptyJSClass } from "../js/EmptyJSClass";
import { IClassFactory, IFieldsAndMethods, IUIClassMap, IViewsAndFragments } from "./IClassFactory";

export class JSClassFactory implements IClassFactory<CustomJSClass> {
	private readonly syntaxAnalyser: ISyntaxAnalyser;
	private parser!: UI5JSParser;
	private _UIClasses!: IUIClassMap;
	constructor(syntaxAnalyser: ISyntaxAnalyser) {
		this.syntaxAnalyser = syntaxAnalyser;
	}

	setParser(parser: UI5JSParser) {
		this.parser = parser;
		this._UIClasses = {
			Promise: new NativeJSClass("Promise", parser),
			array: new NativeJSClass("array", parser),
			string: new NativeJSClass("string", parser),
			Array: new NativeJSClass("Array", parser),
			String: new NativeJSClass("String", parser)
		};
	}

	isCustomClass(UIClass: AbstractBaseClass): UIClass is CustomJSClass {
		return UIClass instanceof CustomJSClass;
	}

	private _createTypeDefDocClass(jsdoc: any) {
		const typedefDoc = jsdoc.tags?.find((tag: any) => {
			return tag.tag === "typedef";
		});
		const className = typedefDoc.name;
		const properties = jsdoc.tags.filter((tag: any) => tag.tag === "property");
		const typeDefClass = new NativeJSClass(className, this.parser);
		typeDefClass.fields = properties.map((property: any): IUIField => {
			return {
				description: property.description,
				name: property.name,
				visibility: "public",
				type: property.type,
				abstract: false,
				owner: className,
				static: false,
				deprecated: false
			};
		});
		this._UIClasses[className] = typeDefClass;
	}

	private _getInstance(className: string, documentText?: string) {
		let returnClass: AbstractBaseClass;
		const isThisClassFromAProject = !!ParserPool.getManifestForClass(className);
		if (!isThisClassFromAProject) {
			returnClass = new StandardUIClass(className, this.parser);
		} else {
			returnClass = new CustomJSClass(className, this.syntaxAnalyser, this.parser, documentText);
			if (returnClass instanceof CustomJSClass) {
				returnClass.comments?.forEach(comment => {
					const typedefDoc = comment.jsdoc?.tags?.find((tag: any) => {
						return tag.tag === "typedef";
					});
					if (typedefDoc) {
						this._createTypeDefDocClass(comment.jsdoc);
					}
				});
			}
		}
		if (!returnClass.classExists) {
			returnClass = new EmptyJSClass(className, this.parser);
		}

		return returnClass;
	}

	isClassAChildOfClassB(classA: string, classB: string): boolean {
		let isExtendedBy = false;
		const UIClass = this.getUIClass(classA);

		if (classA === classB || UIClass.interfaces.includes(classB)) {
			isExtendedBy = true;
		} else if (UIClass.parentClassNameDotNotation) {
			isExtendedBy = this.isClassAChildOfClassB(UIClass.parentClassNameDotNotation, classB);
		}

		return isExtendedBy;
	}

	setNewContentForClassUsingDocument(document: TextDocument, force = false) {
		const documentText = document.getText();
		const currentClassName = this.parser.fileReader.getClassNameFromPath(document.fileName);

		if (currentClassName && documentText) {
			this.setNewCodeForClass(currentClassName, documentText, force);
		}
	}

	setNewCodeForClass(classNameDotNotation: string, classFileText: string, force = false) {
		const previousClassInstance = this._UIClasses[classNameDotNotation];
		const classDoesNotExist = !previousClassInstance || previousClassInstance instanceof EmptyJSClass;
		if (
			force ||
			classDoesNotExist ||
			(previousClassInstance instanceof CustomJSClass &&
				(previousClassInstance.classText.length !== classFileText.length ||
					previousClassInstance.classText !== classFileText))
		) {
			// console.time(`Class parsing for ${classNameDotNotation} took`);
			const oldClass = this._UIClasses[classNameDotNotation];
			if (oldClass && oldClass instanceof CustomJSClass && oldClass.acornClassBody) {
				this._clearAcornNodes(oldClass);
			}
			this._UIClasses[classNameDotNotation] = this._getInstance(classNameDotNotation, classFileText);

			const UIClass = this._UIClasses[classNameDotNotation];
			if (UIClass instanceof CustomJSClass) {
				this.enrichTypesInCustomClass(UIClass);
			}
			// console.timeEnd(`Class parsing for ${classNameDotNotation} took`);
		}
	}

	private _clearAcornNodes(oldClass: CustomJSClass) {
		const allContent = this.syntaxAnalyser.expandAllContent(oldClass.acornClassBody);
		allContent.forEach((content: any) => {
			delete content.expandedContent;
		});
	}

	enrichTypesInCustomClass(UIClass: CustomJSClass) {
		// console.time(`Enriching ${UIClass.className} took`);
		this._preloadParentIfNecessary(UIClass);
		this._enrichMethodParamsWithEventType(UIClass);
		this._checkIfMembersAreUsedInXMLDocuments(UIClass);
		UIClass.methods.forEach(method => {
			this.syntaxAnalyser.findMethodReturnType(method, UIClass.className, false, true);
		});
		UIClass.fields.forEach(field => {
			this.syntaxAnalyser.findFieldType(field, UIClass.className, false, true);
		});
		// console.timeEnd(`Enriching ${UIClass.className} took`);
	}

	private _preloadParentIfNecessary(UIClass: CustomJSClass) {
		if (UIClass.parentClassNameDotNotation) {
			this.getUIClass(UIClass.parentClassNameDotNotation);
		}
	}

	private _checkIfMembersAreUsedInXMLDocuments(CurrentUIClass: CustomJSClass) {
		const viewsAndFragments = this.getViewsAndFragmentsOfControlHierarchically(
			CurrentUIClass,
			[],
			true,
			true,
			true
		);
		const XMLDocuments = [...viewsAndFragments.views, ...viewsAndFragments.fragments];
		XMLDocuments.forEach(XMLDocument => {
			CurrentUIClass.methods.forEach(method => {
				if (!method.mentionedInTheXMLDocument) {
					const regex = new RegExp(`(\\.|"|')${method.name}(\\.|"|'|\\()`);
					method.mentionedInTheXMLDocument = regex.test(XMLDocument.content);
				}
			});
			CurrentUIClass.fields.forEach(field => {
				if (!field.mentionedInTheXMLDocument) {
					const regex = new RegExp(`(\\.|"|')${field.name}("|'|\\.)`);
					if (XMLDocument) {
						const isFieldMentionedInTheView = regex.test(XMLDocument.content);
						if (isFieldMentionedInTheView) {
							field.mentionedInTheXMLDocument = true;
						}
					}
				}
			});
		});
	}

	getFieldsAndMethodsForClass(className: string, returnDuplicates = true) {
		const fieldsAndMethods: IFieldsAndMethods = {
			className: className,
			fields: [],
			methods: []
		};

		if (className) {
			fieldsAndMethods.fields = this.getClassFields(className, returnDuplicates);
			fieldsAndMethods.methods = this.getClassMethods(className, returnDuplicates);
		}

		return fieldsAndMethods;
	}

	getClassFields(className: string, returnDuplicates = true) {
		let fields: IUIField[] = [];
		const UIClass = this.getUIClass(className);
		fields = UIClass.fields;
		if (UIClass.parentClassNameDotNotation) {
			fields = fields.concat(this.getClassFields(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			fields = fields.reduce((accumulator: IUIField[], field: IUIField) => {
				const fieldInAccumulator = accumulator.find(accumulatorField => accumulatorField.name === field.name);
				if (!fieldInAccumulator) {
					accumulator.push(field);
				}
				return accumulator;
			}, []);
		}

		return fields;
	}

	getClassMethods(className: string, returnDuplicates = true, methods: IUIMethod[] = []) {
		const UIClass = this.getUIClass(className);
		methods.push(...UIClass.methods);
		if (UIClass.parentClassNameDotNotation) {
			this.getClassMethods(UIClass.parentClassNameDotNotation, true, methods);
		}

		//remove duplicates
		if (!returnDuplicates) {
			methods = methods.reduce((accumulator: IUIMethod[], method: IUIMethod) => {
				const methodInAccumulator = accumulator.find(
					accumulatorMethod => accumulatorMethod.name === method.name
				);
				if (!methodInAccumulator) {
					accumulator.push(method);
				}
				return accumulator;
			}, []);
		}

		return methods;
	}

	getClassEvents(className: string, returnDuplicates = true) {
		const UIClass = this.getUIClass(className);
		let events: IUIEvent[] = UIClass.events;
		if (UIClass.parentClassNameDotNotation) {
			events = events.concat(this.getClassEvents(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			events = events.reduce((accumulator: IUIEvent[], event: IUIEvent) => {
				const eventInAccumulator = accumulator.find(accumulatorEvent => accumulatorEvent.name === event.name);
				if (!eventInAccumulator) {
					accumulator.push(event);
				}
				return accumulator;
			}, []);
		}

		return events;
	}

	getClassAggregations(className: string, returnDuplicates = true) {
		const UIClass = this.getUIClass(className);
		let aggregations: IUIAggregation[] = UIClass.aggregations;
		if (UIClass.parentClassNameDotNotation) {
			aggregations = aggregations.concat(this.getClassAggregations(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			aggregations = aggregations.reduce((accumulator: IUIAggregation[], aggregation: IUIAggregation) => {
				const aggregationInAccumulator = accumulator.find(
					accumulatorAggregation => accumulatorAggregation.name === aggregation.name
				);
				if (!aggregationInAccumulator) {
					accumulator.push(aggregation);
				}
				return accumulator;
			}, []);
		}
		return aggregations;
	}

	getClassAssociations(className: string, returnDuplicates = true) {
		const UIClass = this.getUIClass(className);
		let associations: IUIAssociation[] = UIClass.associations;
		if (UIClass.parentClassNameDotNotation) {
			associations = associations.concat(this.getClassAssociations(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			associations = associations.reduce((accumulator: IUIAssociation[], association: IUIAssociation) => {
				const associationInAccumulator = accumulator.find(
					accumulatorAssociation => accumulatorAssociation.name === association.name
				);
				if (!associationInAccumulator) {
					accumulator.push(association);
				}
				return accumulator;
			}, []);
		}
		return associations;
	}

	getClassProperties(className: string, returnDuplicates = true) {
		const UIClass = this.getUIClass(className);
		let properties: IUIProperty[] = UIClass.properties;
		if (UIClass.parentClassNameDotNotation) {
			properties = properties.concat(this.getClassProperties(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			properties = properties.reduce((accumulator: IUIProperty[], property: IUIProperty) => {
				const propertyInAccumulator = accumulator.find(
					accumulatorProperty => accumulatorProperty.name === property.name
				);
				if (!propertyInAccumulator) {
					accumulator.push(property);
				}
				return accumulator;
			}, []);
		}
		return properties;
	}

	getUIClass(className: string) {
		if (!this._UIClasses[className]) {
			const parser = ParserPool.getParserForCustomClass(className);
			if (parser && parser !== this.parser) {
				const UIClass = parser?.classFactory.getUIClass(className);
				if (UIClass) {
					return UIClass;
				}
			}
		}

		if (!this._UIClasses[className]) {
			this._UIClasses[className] = this._getInstance(className);
			const UIClass = this._UIClasses[className];
			if (UIClass instanceof CustomJSClass) {
				this.enrichTypesInCustomClass(UIClass);
			}
		}

		return this._UIClasses[className];
	}

	private _enrichMethodParamsWithEventType(CurrentUIClass: CustomJSClass) {
		// console.time(`Enriching types ${CurrentUIClass.className}`);
		this._enrichMethodParamsWithEventTypeFromViewsAndFragments(CurrentUIClass);
		this._enrichMethodParamsWithEventTypeFromAttachEvents(CurrentUIClass);
		// console.timeEnd(`Enriching types ${CurrentUIClass.className}`);
	}

	private _enrichMethodParamsWithEventTypeFromViewsAndFragments(CurrentUIClass: CustomJSClass) {
		const viewsAndFragments = this.getViewsAndFragmentsOfControlHierarchically(
			CurrentUIClass,
			[],
			true,
			true,
			true
		);
		const XMLDocuments = [...viewsAndFragments.views, ...viewsAndFragments.fragments];
		XMLDocuments.forEach(XMLDocument => {
			CurrentUIClass.methods.forEach(method => {
				if (!method.isEventHandler && !method.mentionedInTheXMLDocument) {
					const regex = new RegExp(`(\\.|"|')${method.name}"`);
					if (XMLDocument) {
						const isMethodMentionedInTheView = regex.test(XMLDocument.content);
						if (isMethodMentionedInTheView) {
							method.mentionedInTheXMLDocument = true;
							method.isEventHandler = true;
							if (method?.node?.params && method?.node?.params[0] && !method.node.params[0].jsType) {
								method.node.params[0].jsType = "sap.ui.base.Event";
							}
						}
					}
				}
			});
		});
	}

	getViewsAndFragmentsOfControlHierarchically(
		CurrentUIClass: AbstractCustomClass,
		checkedClasses: string[] = [],
		removeDuplicates = true,
		includeChildren = false,
		includeMentioned = false,
		includeParents = true
	): IViewsAndFragments {
		if (checkedClasses.includes(CurrentUIClass.className)) {
			return { fragments: [], views: [] };
		}

		if (CurrentUIClass.relatedViewsAndFragments) {
			const cache = CurrentUIClass.relatedViewsAndFragments.find(viewAndFragment => {
				const flags = viewAndFragment.flags;
				return (
					flags.removeDuplicates === removeDuplicates &&
					flags.includeChildren === includeChildren &&
					flags.includeMentioned === includeMentioned &&
					flags.includeParents === includeParents
				);
			});

			if (cache) {
				return cache;
			}
		}

		checkedClasses.push(CurrentUIClass.className);
		const viewsAndFragments: IViewsAndFragments = this.getViewsAndFragmentsRelatedTo(CurrentUIClass);

		const relatedClasses: AbstractCustomClass[] = [];
		if (includeParents) {
			const parentUIClasses = ParserPool.getAllCustomUIClasses().filter(
				UIClass =>
					this.isClassAChildOfClassB(CurrentUIClass.className, UIClass.className) &&
					CurrentUIClass !== UIClass
			);
			relatedClasses.push(...parentUIClasses);
		}
		if (includeChildren) {
			relatedClasses.push(...this._getAllChildrenOfClass(CurrentUIClass));
		}
		if (includeMentioned) {
			const importingClasses = this._getAllClassesWhereClassIsImported(CurrentUIClass.className);
			importingClasses.forEach(importinClass => {
				relatedClasses.push(importinClass);
				relatedClasses.push(...this._getAllChildrenOfClass(importinClass));
			});
		}
		const relatedViewsAndFragments = relatedClasses.reduce(
			(accumulator: IViewsAndFragments, relatedUIClass: AbstractCustomClass) => {
				const relatedFragmentsAndViews = this.getViewsAndFragmentsOfControlHierarchically(
					relatedUIClass,
					checkedClasses,
					false,
					false,
					includeMentioned,
					false
				);
				accumulator.fragments = accumulator.fragments.concat(relatedFragmentsAndViews.fragments);
				accumulator.views = accumulator.views.concat(relatedFragmentsAndViews.views);
				return accumulator;
			},
			{
				views: [],
				fragments: []
			}
		);
		viewsAndFragments.fragments = viewsAndFragments.fragments.concat(relatedViewsAndFragments.fragments);
		viewsAndFragments.views = viewsAndFragments.views.concat(relatedViewsAndFragments.views);
		viewsAndFragments.views.forEach(view => {
			viewsAndFragments.fragments.push(
				...this._getFragmentFromViewManifestExtensions(CurrentUIClass.className, view)
			);
		});

		if (removeDuplicates) {
			this._removeDuplicatesForViewsAndFragments(viewsAndFragments);
		}

		if (!CurrentUIClass.relatedViewsAndFragments) {
			CurrentUIClass.relatedViewsAndFragments = [];
		}

		CurrentUIClass.relatedViewsAndFragments.push({
			...viewsAndFragments,
			flags: {
				removeDuplicates,
				includeChildren,
				includeMentioned,
				includeParents
			}
		});

		return viewsAndFragments;
	}

	private _removeDuplicatesForViewsAndFragments(viewsAndFragments: IViewsAndFragments) {
		viewsAndFragments.views.forEach(view => {
			viewsAndFragments.fragments.push(...this.parser.fileReader.getFragmentsInXMLFile(view));
		});

		viewsAndFragments.fragments.forEach(fragment => {
			viewsAndFragments.fragments.push(...this.parser.fileReader.getFragmentsInXMLFile(fragment));
		});

		viewsAndFragments.fragments = viewsAndFragments.fragments.reduce((accumulator: IFragment[], fragment) => {
			if (!accumulator.find(accumulatorFragment => accumulatorFragment.fsPath === fragment.fsPath)) {
				accumulator.push(fragment);
			}
			return accumulator;
		}, []);

		viewsAndFragments.views = viewsAndFragments.views.reduce((accumulator: IView[], view) => {
			if (!accumulator.find(accumulatorFragment => accumulatorFragment.fsPath === view.fsPath)) {
				accumulator.push(view);
			}
			return accumulator;
		}, []);
	}

	getViewsAndFragmentsRelatedTo(CurrentUIClass: AbstractCustomClass) {
		const viewsAndFragments: IViewsAndFragments = {
			views: [],
			fragments: []
		};

		viewsAndFragments.fragments = this.parser.fileReader.getFragmentsMentionedInClass(CurrentUIClass.className);
		const views = [];
		const view = this.parser.fileReader.getViewForController(CurrentUIClass.className);
		if (view) {
			views.push(view);
			viewsAndFragments.fragments.push(...view.fragments);
		}
		viewsAndFragments.views = views;

		const fragments = ParserPool.getAllFragments();
		const allViews = ParserPool.getAllViews();

		//check for mentioning
		fragments.forEach(fragment => {
			if (fragment.content.includes(`${CurrentUIClass.className}.`)) {
				viewsAndFragments.fragments.push(fragment);
			}
		});
		allViews.forEach(view => {
			if (view.content.includes(`${CurrentUIClass.className}.`)) {
				viewsAndFragments.views.push(view);
			}
		});

		return viewsAndFragments;
	}

	private _getAllClassesWhereClassIsImported(className: string) {
		return ParserPool.getAllCustomUIClasses().filter(UIClass => {
			return (
				UIClass.parentClassNameDotNotation !== className &&
				!!UIClass.UIDefine.find(UIDefine => {
					return UIDefine.classNameDotNotation === className;
				})
			);
		});
	}

	private _getAllChildrenOfClass(UIClass: AbstractCustomClass, bFirstLevelinheritance = false) {
		if (bFirstLevelinheritance) {
			return ParserPool.getAllCustomUIClasses().filter(CurrentUIClass => {
				return CurrentUIClass.parentClassNameDotNotation === UIClass.className;
			});
		} else {
			return ParserPool.getAllCustomUIClasses().filter(CurrentUIClass => {
				return (
					this.isClassAChildOfClassB(CurrentUIClass.className, UIClass.className) &&
					UIClass.className !== CurrentUIClass.className
				);
			});
		}
	}

	getAllCustomUIClasses(): AbstractCustomClass[] {
		const allUIClasses = this.getAllExistentUIClasses();

		return Object.keys(allUIClasses)
			.filter(UIClassName => {
				return allUIClasses[UIClassName] instanceof AbstractCustomClass;
			})
			.map(UIClassName => allUIClasses[UIClassName] as AbstractCustomClass);
	}

	private _getFragmentFromViewManifestExtensions(className: string, view: IView) {
		const fragments: IFragment[] = [];
		const viewName = this.parser.fileReader.getClassNameFromPath(view.fsPath);
		if (viewName) {
			const extensions = this.parser.fileReader.getManifestExtensionsForClass(className);
			const viewExtension =
				extensions && extensions["sap.ui.viewExtensions"] && extensions["sap.ui.viewExtensions"][viewName];
			if (viewExtension) {
				Object.keys(viewExtension).forEach(key => {
					const extension = viewExtension[key];
					if (extension.type === "XML" && extension.className === "sap.ui.core.Fragment") {
						const fragmentName = extension.fragmentName;
						const fragment = ParserPool.getFragment(fragmentName);
						if (fragment) {
							const fragmentsInFragment: IFragment[] =
								this.parser.fileReader.getFragmentsInXMLFile(fragment);
							fragments.push(fragment, ...fragmentsInFragment);
						}
					}
				});
			}
		}

		return fragments;
	}

	private _enrichMethodParamsWithEventTypeFromAttachEvents(UIClass: CustomJSClass) {
		UIClass.methods.forEach(method => {
			const eventData = this.syntaxAnalyser.getEventHandlerDataFromJSClass(UIClass.className, method.name);
			if (eventData) {
				method.isEventHandler = true;
				if (method?.node?.params && method?.node?.params[0] && !method.node.params[0].jsType) {
					method.node.params[0].jsType = "sap.ui.base.Event";
				}
			}
		});
	}

	getAllExistentUIClasses() {
		return this._UIClasses;
	}

	getDefaultModelForClass(className: string): string | undefined {
		let defaultModel;
		const UIClass = this.getUIClass(className);
		if (UIClass instanceof CustomJSClass) {
			const defaultModelOfClass = this.syntaxAnalyser.getClassNameOfTheModelFromManifest("", className, true);
			if (defaultModelOfClass) {
				const modelUIClass = this.getUIClass(defaultModelOfClass);
				if (modelUIClass instanceof CustomJSClass) {
					defaultModel = defaultModelOfClass;
				}
			} else if (UIClass.parentClassNameDotNotation) {
				defaultModel = this.getDefaultModelForClass(UIClass.parentClassNameDotNotation);
			}
		}

		return defaultModel;
	}

	isMethodOverriden(className: string, methodName: string) {
		let isMethodOverriden = false;
		let sameField = false;
		const UIClass = this.getUIClass(className);
		if (UIClass.parentClassNameDotNotation) {
			const fieldsAndMethods = this.getFieldsAndMethodsForClass(UIClass.parentClassNameDotNotation);
			const allMethods = fieldsAndMethods.methods;
			const allFields = fieldsAndMethods.fields;
			const sameMethod = !!allMethods.find(methodFromParent => {
				return methodFromParent.name === methodName;
			});

			if (!sameMethod) {
				sameField = !!allFields.find(fieldFromParent => {
					return fieldFromParent.name === methodName;
				});
			}

			isMethodOverriden = sameMethod || sameField;

			if (!isMethodOverriden && UIClass.interfaces.length > 0) {
				isMethodOverriden = !!UIClass.interfaces.find(theInterface => {
					const fieldsAndMethods = this.getFieldsAndMethodsForClass(theInterface);
					const allMethods = fieldsAndMethods.methods;
					const allFields = fieldsAndMethods.fields;
					const sameMethod = !!allMethods.find(methodFromParent => {
						return methodFromParent.name === methodName;
					});

					if (!sameMethod) {
						sameField = !!allFields.find(fieldFromParent => {
							return fieldFromParent.name === methodName;
						});
					}

					return sameMethod || sameField;
				});
			}
		}

		return isMethodOverriden;
	}

	removeClass(className: string) {
		delete this._UIClasses[className];
	}

	getParent(UIClass: AbstractBaseClass) {
		if (UIClass.parentClassNameDotNotation) {
			return this.getUIClass(UIClass.parentClassNameDotNotation);
		}
	}

	setNewNameForClass(oldPath: string, newPath: string) {
		const oldName = this.parser.fileReader.getClassNameFromPath(oldPath);
		const newName = this.parser.fileReader.getClassNameFromPath(newPath);
		if (oldName && newName) {
			const oldClass = this._UIClasses[oldName];
			this._UIClasses[newName] = oldClass;
			oldClass.className = newName;

			if (oldClass instanceof CustomJSClass) {
				const newClassFSPath = this.parser.fileReader.convertClassNameToFSPath(
					newName,
					oldClass.fsPath?.endsWith(".controller.js")
				);
				if (newClassFSPath) {
					oldClass.fsPath = newClassFSPath;
				}
			}

			ParserPool.getAllCustomUIClasses().forEach(UIClass => {
				if (UIClass.parentClassNameDotNotation === oldName) {
					UIClass.parentClassNameDotNotation = newName;
				}
			});
			this.removeClass(oldName);

			const UIClass = this._UIClasses[newName];
			if (UIClass instanceof CustomJSClass && UIClass.fsPath?.endsWith(".controller.js")) {
				const view = this.parser.fileReader.getViewForController(oldName);
				if (view) {
					this.parser.fileReader.removeView(view.name);
				}
			}
		}
	}
}
