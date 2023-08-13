import { ClassDeclaration, ObjectLiteralExpression, Project, SourceFile, TypeChecker, ts } from "ts-morph";
import { UI5TSParser } from "../../../../parser/UI5TSParser";
import ParserPool from "../../../../parser/pool/ParserPool";
import { StandardUIClass } from "../../ui5class/StandardUIClass";
import { EmptyJSClass } from "../../ui5class/js/EmptyJSClass";
import { CustomTSClass } from "../../ui5class/ts/CustomTSClass";
import { CustomTSObject } from "../../ui5class/ts/CustomTSObject";
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
import { IClassFactory, IFieldsAndMethods, IUIClassMap, IViewsAndFragments } from "./IClassFactory";

export class TSClassFactory implements IClassFactory<CustomTSClass | CustomTSObject> {
	private readonly _UIClasses: IUIClassMap = {};
	private parser!: UI5TSParser;
	setParser(parser: UI5TSParser) {
		this.parser = parser;
	}

	isCustomClass(UIClass: AbstractBaseClass): UIClass is CustomTSClass | CustomTSObject {
		return UIClass instanceof CustomTSClass || UIClass instanceof CustomTSObject;
	}

	private _getInstance(
		className: string,
		declaration?: ClassDeclaration | ObjectLiteralExpression,
		typeChecker?: TypeChecker
	) {
		let returnClass: AbstractBaseClass | undefined;
		const isThisClassFromAProject = !!ParserPool.getManifestForClass(className);
		if (!isThisClassFromAProject) {
			returnClass = new StandardUIClass(className, this.parser);
		} else if (isThisClassFromAProject) {
			if (!declaration && !typeChecker) {
				const fileName = this.parser.fileReader.getClassFSPathFromClassName(className);
				const project = fileName ? this.parser.getProject(fileName) : undefined;
				typeChecker = project?.getTypeChecker();
				const sourceFile = fileName ? project?.getSourceFile(fileName) : undefined;

				const [syntaxList] = sourceFile?.getChildrenOfKind(ts.SyntaxKind.SyntaxList) ?? [];
				declaration = syntaxList
					?.getChildren()
					.find(child => child.asKind(ts.SyntaxKind.ClassDeclaration)?.isDefaultExport())
					?.asKind(ts.SyntaxKind.ClassDeclaration);

				const [exportAssignment] = syntaxList?.getChildrenOfKind(ts.SyntaxKind.ExportAssignment) ?? [];
				const [objectLiteralExpression] =
					exportAssignment?.getChildrenOfKind(ts.SyntaxKind.ObjectLiteralExpression) ?? [];

				if (!declaration) {
					declaration = objectLiteralExpression;
				}
			}
			if (declaration && typeChecker && declaration instanceof ClassDeclaration) {
				returnClass = new CustomTSClass(declaration, this.parser, typeChecker);
			} else if (declaration && typeChecker && declaration instanceof ObjectLiteralExpression) {
				returnClass = new CustomTSObject(declaration, this.parser, typeChecker);
			} else {
				returnClass = new EmptyJSClass(className, this.parser);
			}
		} else {
			returnClass = new EmptyJSClass(className, this.parser);
		}

		if (!returnClass.classExists && !(returnClass instanceof EmptyJSClass)) {
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

	setNewCodeForClass(
		classNameDotNotation: string,
		classFileText: string,
		force = false,
		sourceFile?: SourceFile,
		project?: Project,
		enrichWithXMLReferences = true,
		textChanges: ts.TextChange[] = []
	) {
		const classDoesNotExist = !this._UIClasses[classNameDotNotation];
		if (
			classDoesNotExist ||
			(<CustomTSClass | CustomTSObject>this._UIClasses[classNameDotNotation]).classText?.length !==
				classFileText.length ||
			(<CustomTSClass | CustomTSObject>this._UIClasses[classNameDotNotation]).classText !== classFileText
		) {
			// console.time(`Class parsing for ${classNameDotNotation} took`);
			if (!sourceFile && !project) {
				const fileName = this.parser.fileReader.getClassFSPathFromClassName(classNameDotNotation);
				project = fileName ? this.parser.getProject(fileName) : undefined;
				sourceFile = fileName ? project?.getSourceFile(fileName) : undefined;
				if (project && !sourceFile && fileName) {
					sourceFile = project.addSourceFileAtPathIfExists(fileName);
				}
			}

			if (project && sourceFile) {
				if (sourceFile.getFullText().length !== classFileText.length) {
					if (textChanges.length === 0) {
						textChanges = [
							{
								newText: classFileText,
								span: { start: 0, length: sourceFile.getFullText().length }
							}
						];
					}

					const newSourceFile = sourceFile?.applyTextChanges(textChanges);
					sourceFile = newSourceFile;
				}
				if (classNameDotNotation) {
					const [syntaxList] = sourceFile.getChildrenOfKind(ts.SyntaxKind.SyntaxList);
					const classDeclaration = syntaxList
						?.getChildren()
						.find(child => child.asKind(ts.SyntaxKind.ClassDeclaration)?.isDefaultExport())
						?.asKind(ts.SyntaxKind.ClassDeclaration);

					const [exportAssignment] = syntaxList?.getChildrenOfKind(ts.SyntaxKind.ExportAssignment) ?? [];
					const [objectLiteralExpression] =
						exportAssignment?.getChildrenOfKind(ts.SyntaxKind.ObjectLiteralExpression) ?? [];

					if (classDeclaration || objectLiteralExpression) {
						const theClass = this._getInstance(
							classNameDotNotation,
							classDeclaration || objectLiteralExpression,
							project.getTypeChecker()
						);
						if (theClass) {
							this._UIClasses[classNameDotNotation] = theClass;
						}
					}
				}
			}

			const UIClass = this._UIClasses[classNameDotNotation];
			if ((UIClass instanceof CustomTSClass || UIClass instanceof CustomTSObject) && enrichWithXMLReferences) {
				this.enrichTypesInCustomClass(UIClass);
			}
			// console.timeEnd(`Class parsing for ${classNameDotNotation} took`);
		} else if (force) {
			const UIClass = this._UIClasses[classNameDotNotation];
			if (UIClass instanceof CustomTSClass || UIClass instanceof CustomTSObject) {
				UIClass.resetCache();
				this.enrichTypesInCustomClass(UIClass);
			}
		}
	}

	enrichTypesInCustomClass(UIClass: CustomTSClass | CustomTSObject) {
		this._enrichAreMethodsEventHandlers(UIClass);
		this._checkIfMembersAreUsedInXMLDocuments(UIClass);
	}

	private _checkIfMembersAreUsedInXMLDocuments(CurrentUIClass: CustomTSClass | CustomTSObject) {
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

	private _enrichAreMethodsEventHandlers(CurrentUIClass: CustomTSClass | CustomTSObject) {
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
			const theClass = this._getInstance(className);
			if (theClass) {
				this._UIClasses[className] = theClass;
			}
			const UIClass = this._UIClasses[className];
			if (UIClass instanceof CustomTSClass || UIClass instanceof CustomTSObject) {
				this._checkIfMembersAreUsedInXMLDocuments(UIClass);
			}
		}

		return this._UIClasses[className];
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
		const allUIClasses = ParserPool.getAllExistentUIClasses();

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

	getAllExistentUIClasses() {
		return this._UIClasses;
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
			if (!oldClass) {
				return;
			}
			delete this._UIClasses[oldName];

			ParserPool.getAllCustomUIClasses().forEach(UIClass => {
				if (UIClass.parentClassNameDotNotation === oldName) {
					UIClass.parentClassNameDotNotation = newName;
				}
			});
		}
	}

	getDefaultModelForClass(className: string): string | undefined {
		let defaultModel;
		const UIClass = this.getUIClass(className);
		if (UIClass instanceof CustomTSClass) {
			const defaultModelOfClass = this._getClassNameOfTheModelFromManifest(UIClass);
			if (defaultModelOfClass) {
				const modelUIClass = this.getUIClass(defaultModelOfClass);
				if (modelUIClass instanceof CustomTSClass) {
					defaultModel = defaultModelOfClass;
				}
			} else if (UIClass.parentClassNameDotNotation) {
				defaultModel = this.getDefaultModelForClass(UIClass.parentClassNameDotNotation);
			}
		}

		return defaultModel;
	}

	private _getClassNameOfTheModelFromManifest(UIClass: CustomTSClass) {
		let defaultModelName: string | undefined;

		const fnForEachChild = (node: ts.Node) => {
			let necessaryNode: ts.CallExpression | undefined;
			ts.forEachChild(node, child => {
				if (necessaryNode) {
					return;
				}
				if (
					ts.isCallExpression(child) &&
					ts.isPropertyAccessExpression(child.expression) &&
					child.expression.name.escapedText === "setModel"
				) {
					necessaryNode = child;
				} else {
					necessaryNode = fnForEachChild(child);
				}
			});

			return necessaryNode;
		};
		UIClass.methods.find(method => {
			if (!method.node) {
				return false;
			}
			const child = fnForEachChild(method.node?.compilerNode);
			const args = child?.arguments;
			const firstArg = args?.[0];
			if (
				firstArg &&
				((ts.isCallExpression(firstArg) &&
					firstArg.arguments?.[0] &&
					ts.isStringLiteral(firstArg.arguments[0])) ||
					ts.isNewExpression(firstArg))
			) {
				// const modelName = firstArg.arguments[0].text;
				const modelType = UIClass.typeChecker.compilerObject.getTypeAtLocation(firstArg);
				const modelSymbol = modelType.getSymbol();
				const declaration = modelSymbol?.declarations?.[0];
				const sourceFile = declaration?.getSourceFile();
				const parentFileName = sourceFile?.fileName;

				if (parentFileName) {
					defaultModelName = this.parser.fileReader.getClassNameFromPath(parentFileName);
				}
			}
		});

		return defaultModelName;
	}
}
