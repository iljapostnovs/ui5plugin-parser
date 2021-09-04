import { AbstractUIClass, IUIAggregation, IUIAssociation, IUIEvent, IUIField, IUIMethod, IUIProperty } from "./UI5Parser/UIClass/AbstractUIClass";
import { CustomUIClass } from "./UI5Parser/UIClass/CustomUIClass";
import { StandardUIClass } from "./UI5Parser/UIClass/StandardUIClass";
import { JSClass } from "./UI5Parser/UIClass/JSClass";
import { IFragment, IView } from "../utils/FileReader";
import { TextDocument } from "./abstraction/TextDocument";
import { UI5Parser } from "../../UI5Parser";
import { IFieldsAndMethods, IUIClassFactory, IUIClassMap, IViewsAndFragments } from "./interfaces/IUIClassFactory";
import { ISyntaxAnalyser } from "./JSParser/ISyntaxAnalyser";

export class UIClassFactory implements IUIClassFactory {
	private readonly syntaxAnalyser: ISyntaxAnalyser;
	constructor(syntaxAnalyser: ISyntaxAnalyser) {
		this.syntaxAnalyser = syntaxAnalyser;
	}

	private readonly _UIClasses: IUIClassMap = {
		Promise: new JSClass("Promise"),
		array: new JSClass("array"),
		string: new JSClass("string"),
		Array: new JSClass("Array"),
		String: new JSClass("String")
	};

	private _getInstance(className: string, documentText?: string) {
		let returnClass: AbstractUIClass;
		const isThisClassFromAProject = !!UI5Parser.getInstance().fileReader.getManifestForClass(className);
		if (!isThisClassFromAProject) {
			returnClass = new StandardUIClass(className);
		} else {
			returnClass = new CustomUIClass(className, this.syntaxAnalyser, documentText);
		}

		return returnClass;
	}

	public isClassAChildOfClassB(classA: string, classB: string): boolean {
		let isExtendedBy = false;
		const UIClass = this.getUIClass(classA);

		if (classA === classB || UIClass.interfaces.includes(classB)) {
			isExtendedBy = true;
		} else if (UIClass.parentClassNameDotNotation) {
			isExtendedBy = this.isClassAChildOfClassB(UIClass.parentClassNameDotNotation, classB);
		}

		return isExtendedBy;
	}

	public setNewContentForClassUsingDocument(document: TextDocument, force = false) {
		const documentText = document.getText();
		const currentClassName = UI5Parser.getInstance().fileReader.getClassNameFromPath(document.fileName);

		if (currentClassName && documentText) {
			this.setNewCodeForClass(currentClassName, documentText, force);
		}
	}

	public setNewCodeForClass(classNameDotNotation: string, classFileText: string, force = false) {
		const classDoesNotExist = !this._UIClasses[classNameDotNotation];
		if (
			force ||
			classDoesNotExist ||
			(<CustomUIClass>this._UIClasses[classNameDotNotation]).classText.length !== classFileText.length ||
			(<CustomUIClass>this._UIClasses[classNameDotNotation]).classText !== classFileText
		) {
			// console.time(`Class parsing for ${classNameDotNotation} took`);
			const oldClass = this._UIClasses[classNameDotNotation];
			if (oldClass && oldClass instanceof CustomUIClass && oldClass.acornClassBody) {
				this._clearAcornNodes(oldClass);
			}
			this._UIClasses[classNameDotNotation] = this._getInstance(classNameDotNotation, classFileText);

			const UIClass = this._UIClasses[classNameDotNotation];
			if (UIClass instanceof CustomUIClass) {
				this.enrichTypesInCustomClass(UIClass);
			}
			// console.timeEnd(`Class parsing for ${classNameDotNotation} took`);

		}
	}

	private _clearAcornNodes(oldClass: CustomUIClass) {
		const allContent = this.syntaxAnalyser.expandAllContent(oldClass.acornClassBody);
		allContent.forEach((content: any) => {
			delete content.expandedContent;
		});
	}

	public enrichTypesInCustomClass(UIClass: CustomUIClass) {
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

	private _preloadParentIfNecessary(UIClass: CustomUIClass) {
		if (UIClass.parentClassNameDotNotation) {
			this.getUIClass(UIClass.parentClassNameDotNotation);
		}
	}

	private _checkIfMembersAreUsedInXMLDocuments(CurrentUIClass: CustomUIClass) {
		const viewsAndFragments = this.getViewsAndFragmentsOfControlHierarchically(CurrentUIClass, [], true, true, true);
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

	public getFieldsAndMethodsForClass(className: string, returnDuplicates = true) {
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

	public getClassFields(className: string, returnDuplicates = true) {
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

	public getClassMethods(className: string, returnDuplicates = true, methods: IUIMethod[] = []) {
		const UIClass = this.getUIClass(className);
		methods.push(...UIClass.methods);
		if (UIClass.parentClassNameDotNotation) {
			this.getClassMethods(UIClass.parentClassNameDotNotation, true, methods);
		}

		//remove duplicates
		if (!returnDuplicates) {
			methods = methods.reduce((accumulator: IUIMethod[], method: IUIMethod) => {
				const methodInAccumulator = accumulator.find(accumulatorMethod => accumulatorMethod.name === method.name);
				if (!methodInAccumulator) {
					accumulator.push(method);
				}
				return accumulator;
			}, []);
		}

		return methods;
	}

	public getClassEvents(className: string, returnDuplicates = true) {
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

	public getClassAggregations(className: string, returnDuplicates = true) {
		const UIClass = this.getUIClass(className);
		let aggregations: IUIAggregation[] = UIClass.aggregations;
		if (UIClass.parentClassNameDotNotation) {
			aggregations = aggregations.concat(this.getClassAggregations(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			aggregations = aggregations.reduce((accumulator: IUIAggregation[], aggregation: IUIAggregation) => {
				const aggregationInAccumulator = accumulator.find(accumulatorAggregation => accumulatorAggregation.name === aggregation.name);
				if (!aggregationInAccumulator) {
					accumulator.push(aggregation);
				}
				return accumulator;
			}, []);
		}
		return aggregations;
	}

	public getClassAssociations(className: string, returnDuplicates = true) {
		const UIClass = this.getUIClass(className);
		let associations: IUIAssociation[] = UIClass.associations;
		if (UIClass.parentClassNameDotNotation) {
			associations = associations.concat(this.getClassAssociations(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			associations = associations.reduce((accumulator: IUIAssociation[], association: IUIAssociation) => {
				const associationInAccumulator = accumulator.find(accumulatorAssociation => accumulatorAssociation.name === association.name);
				if (!associationInAccumulator) {
					accumulator.push(association);
				}
				return accumulator;
			}, []);
		}
		return associations;
	}

	public getClassProperties(className: string, returnDuplicates = true) {
		const UIClass = this.getUIClass(className);
		let properties: IUIProperty[] = UIClass.properties;
		if (UIClass.parentClassNameDotNotation) {
			properties = properties.concat(this.getClassProperties(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			properties = properties.reduce((accumulator: IUIProperty[], property: IUIProperty) => {
				const propertyInAccumulator = accumulator.find(accumulatorProperty => accumulatorProperty.name === property.name);
				if (!propertyInAccumulator) {
					accumulator.push(property);
				}
				return accumulator;
			}, []);
		}
		return properties;
	}

	public getUIClass(className: string) {
		if (!this._UIClasses[className]) {
			this._UIClasses[className] = this._getInstance(className);
			const UIClass = this._UIClasses[className];
			if (UIClass instanceof CustomUIClass) {
				this.enrichTypesInCustomClass(UIClass);
			}
		}

		return this._UIClasses[className];
	}

	private _enrichMethodParamsWithEventType(CurrentUIClass: CustomUIClass) {
		// console.time(`Enriching types ${CurrentUIClass.className}`);
		this._enrichMethodParamsWithEventTypeFromViewsAndFragments(CurrentUIClass);
		this._enrichMethodParamsWithEventTypeFromAttachEvents(CurrentUIClass);
		// console.timeEnd(`Enriching types ${CurrentUIClass.className}`);
	}

	private _enrichMethodParamsWithEventTypeFromViewsAndFragments(CurrentUIClass: CustomUIClass) {
		const viewsAndFragments = this.getViewsAndFragmentsOfControlHierarchically(CurrentUIClass, [], true, true, true);
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
							if (method?.acornNode?.params && method?.acornNode?.params[0]) {
								method.acornNode.params[0].jsType = "sap.ui.base.Event";
							}
						}
					}
				}
			});
		});
	}

	getViewsAndFragmentsOfControlHierarchically(CurrentUIClass: CustomUIClass, checkedClasses: string[] = [], removeDuplicates = true, includeChildren = false, includeMentioned = false, includeParents = true): IViewsAndFragments {
		if (checkedClasses.includes(CurrentUIClass.className)) {
			return { fragments: [], views: [] };
		}

		if (CurrentUIClass.relatedViewsAndFragments) {
			const cache = CurrentUIClass.relatedViewsAndFragments.find(viewAndFragment => {
				const flags = viewAndFragment.flags;
				return flags.removeDuplicates === removeDuplicates &&
					flags.includeChildren === includeChildren &&
					flags.includeMentioned === includeMentioned &&
					flags.includeParents === includeParents
			});

			if (cache) {
				return cache;
			}
		}

		checkedClasses.push(CurrentUIClass.className);
		const viewsAndFragments: IViewsAndFragments = this.getViewsAndFragmentsRelatedTo(CurrentUIClass);

		const relatedClasses: CustomUIClass[] = [];
		if (includeParents) {
			const parentUIClasses = this.getAllCustomUIClasses().filter(UIClass => this.isClassAChildOfClassB(CurrentUIClass.className, UIClass.className) && CurrentUIClass !== UIClass);
			relatedClasses.push(...parentUIClasses);
		}
		if (includeChildren) {
			relatedClasses.push(...this._getAllChildrenOfClass(CurrentUIClass));
		}
		if (includeMentioned) {
			relatedClasses.push(...this._getAllClassesWhereClassIsImported(CurrentUIClass.className));
		}
		const relatedViewsAndFragments = relatedClasses.reduce((accumulator: IViewsAndFragments, relatedUIClass: CustomUIClass) => {
			const relatedFragmentsAndViews = this.getViewsAndFragmentsOfControlHierarchically(relatedUIClass, checkedClasses, false, false, includeMentioned, false);
			accumulator.fragments = accumulator.fragments.concat(relatedFragmentsAndViews.fragments);
			accumulator.views = accumulator.views.concat(relatedFragmentsAndViews.views);
			return accumulator;
		}, {
			views: [],
			fragments: []
		});
		viewsAndFragments.fragments = viewsAndFragments.fragments.concat(relatedViewsAndFragments.fragments);
		viewsAndFragments.views = viewsAndFragments.views.concat(relatedViewsAndFragments.views);
		viewsAndFragments.views.forEach(view => {
			viewsAndFragments.fragments.push(...this._getFragmentFromViewManifestExtensions(CurrentUIClass.className, view));
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
			viewsAndFragments.fragments.push(...UI5Parser.getInstance().fileReader.getFragmentsInXMLFile(view));
		});

		viewsAndFragments.fragments.forEach(fragment => {
			viewsAndFragments.fragments.push(...UI5Parser.getInstance().fileReader.getFragmentsInXMLFile(fragment));
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

	getViewsAndFragmentsRelatedTo(CurrentUIClass: CustomUIClass) {
		const viewsAndFragments: IViewsAndFragments = {
			views: [],
			fragments: []
		};

		viewsAndFragments.fragments = UI5Parser.getInstance().fileReader.getFragmentsMentionedInClass(CurrentUIClass.className);
		const views = [];
		const view = UI5Parser.getInstance().fileReader.getViewForController(CurrentUIClass.className);
		if (view) {
			views.push(view);
			viewsAndFragments.fragments.push(...view.fragments);
		}
		viewsAndFragments.views = views;

		const fragments = UI5Parser.getInstance().fileReader.getAllFragments();
		const allViews = UI5Parser.getInstance().fileReader.getAllViews();

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
		return this.getAllCustomUIClasses().filter(UIClass => {
			return UIClass.parentClassNameDotNotation !== className && !!UIClass.UIDefine.find(UIDefine => {
				return UIDefine.classNameDotNotation === className;
			});
		});
	}

	private _getAllChildrenOfClass(UIClass: CustomUIClass, bFirstLevelinheritance = false) {
		return bFirstLevelinheritance ? this.getAllCustomUIClasses().filter(CurrentUIClass => {
			return CurrentUIClass.parentClassNameDotNotation === UIClass.className;
		}) : this.getAllCustomUIClasses().filter(CurrentUIClass => {
			return this.isClassAChildOfClassB(CurrentUIClass.className, UIClass.className) && UIClass.className !== CurrentUIClass.className;
		});
	}

	public getAllCustomUIClasses(): CustomUIClass[] {
		const allUIClasses = this.getAllExistentUIClasses();

		return Object.keys(allUIClasses).filter(UIClassName => {
			return allUIClasses[UIClassName] instanceof CustomUIClass;
		}).map(UIClassName => allUIClasses[UIClassName] as CustomUIClass);
	}

	private _getFragmentFromViewManifestExtensions(className: string, view: IView) {
		const fragments: IFragment[] = [];
		const viewName = UI5Parser.getInstance().fileReader.getClassNameFromPath(view.fsPath);
		if (viewName) {
			const extensions = UI5Parser.getInstance().fileReader.getManifestExtensionsForClass(className);
			const viewExtension = extensions && extensions["sap.ui.viewExtensions"] && extensions["sap.ui.viewExtensions"][viewName];
			if (viewExtension) {
				Object.keys(viewExtension).forEach(key => {
					const extension = viewExtension[key];
					if (extension.type === "XML" && extension.className === "sap.ui.core.Fragment") {
						const fragmentName = extension.fragmentName;
						const fragment = UI5Parser.getInstance().fileReader.getFragment(fragmentName);
						if (fragment) {
							const fragmentsInFragment: IFragment[] = UI5Parser.getInstance().fileReader.getFragmentsInXMLFile(fragment);
							fragments.push(fragment, ...fragmentsInFragment);
						}
					}
				});
			}
		}

		return fragments;
	}

	private _enrichMethodParamsWithEventTypeFromAttachEvents(UIClass: CustomUIClass) {
		UIClass.methods.forEach(method => {
			const eventData = this.syntaxAnalyser.getEventHandlerDataFromJSClass(UIClass.className, method.name);
			if (eventData) {
				method.isEventHandler = true;
				if (method?.acornNode?.params && method?.acornNode?.params[0]) {
					method.acornNode.params[0].jsType = "sap.ui.base.Event";
				}
			}
		});
	}

	public getAllExistentUIClasses() {
		return this._UIClasses;
	}

	public getDefaultModelForClass(className: string): string | undefined {
		let defaultModel;
		const UIClass = this.getUIClass(className);
		if (UIClass instanceof CustomUIClass) {
			const defaultModelOfClass = this.syntaxAnalyser.getClassNameOfTheModelFromManifest("", className, true);
			if (defaultModelOfClass) {
				const modelUIClass = this.getUIClass(defaultModelOfClass);
				if (modelUIClass instanceof CustomUIClass) {
					defaultModel = defaultModelOfClass;
				}
			} else if (UIClass.parentClassNameDotNotation) {
				defaultModel = this.getDefaultModelForClass(UIClass.parentClassNameDotNotation);
			}
		}

		return defaultModel;
	}

	public isMethodOverriden(className: string, methodName: string) {
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
		}

		return isMethodOverriden;
	}

	public removeClass(className: string) {
		delete this._UIClasses[className];
	}

	public getParent(UIClass: AbstractUIClass) {
		if (UIClass.parentClassNameDotNotation) {
			return this.getUIClass(UIClass.parentClassNameDotNotation);
		}
	}

	public setNewNameForClass(oldPath: string, newPath: string) {
		const oldName = UI5Parser.getInstance().fileReader.getClassNameFromPath(oldPath);
		const newName = UI5Parser.getInstance().fileReader.getClassNameFromPath(newPath);
		if (oldName && newName) {
			const oldClass = this._UIClasses[oldName];
			this._UIClasses[newName] = oldClass;
			oldClass.className = newName;

			if (oldClass instanceof CustomUIClass) {
				const newClassFSPath = UI5Parser.getInstance().fileReader.convertClassNameToFSPath(newName, oldClass.classFSPath?.endsWith(".controller.js"));
				if (newClassFSPath) {
					oldClass.classFSPath = newClassFSPath;
				}
			}

			this.getAllCustomUIClasses().forEach(UIClass => {
				if (UIClass.parentClassNameDotNotation === oldName) {
					UIClass.parentClassNameDotNotation = newName;
				}
			});
			this.removeClass(oldName);

			const UIClass = this._UIClasses[newName];
			if (UIClass instanceof CustomUIClass && UIClass.classFSPath?.endsWith(".controller.js")) {
				const view = UI5Parser.getInstance().fileReader.getViewForController(oldName);
				if (view) {
					UI5Parser.getInstance().fileReader.removeView(view.name);
				}
			}
		}
	}
}