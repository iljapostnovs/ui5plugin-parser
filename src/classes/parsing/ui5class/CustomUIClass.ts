/* eslint-disable @typescript-eslint/no-var-requires */
import * as commentParser from "comment-parser";
import * as path from "path";
import { UI5JSParser } from "../../../parser/UI5JSParser";
import { IAcornLocation, IAcornPosition } from "../jsparser/AcornSyntaxAnalyzer";
import { ISyntaxAnalyser } from "../jsparser/ISyntaxAnalyser";
import {
	AbstractCustomClass,
	ICustomClassField,
	ICustomClassMethod,
	ICustomMember,
	IUIDefine
} from "./AbstractCustomClass";
import {
	IUIAggregation,
	IUIAssociation,
	IUIEvent,
	IUIEventParam,
	IUIMethod,
	IUIMethodParam,
	IUIProperty
} from "./AbstractUIClass";
import LineColumn = require("line-column");
const acornLoose = require("acorn-loose");

interface ILooseObject {
	[key: string]: any;
}

interface IComment {
	text: string;
	start: number;
	end: number;
	jsdoc: any;
	loc: IAcornLocation;
}
export interface UI5Ignoreable {
	ui5ignored?: boolean;
}
export interface ICustomClassUIMethod extends ICustomClassMethod<any> {
	acornParams?: any;
}
export interface ICustomClassUIField extends ICustomClassField<any> {
	customData?: ILooseObject;
}
export class CustomUIClass extends AbstractCustomClass<any, any, any, any> {
	classText = "";
	node: any;
	UIDefine: IUIDefine<any>[];
	parentClassNameDotNotation = "";
	fsPath: string;
	public methods: ICustomClassUIMethod[] = [];
	public fields: ICustomClassUIField[] = [];
	public comments: IComment[] = [];
	public acornClassBody: any;
	public acornMethodsAndFields: any[] = [];
	public fileContent: any;
	private _parentVariableName: any;
	public acornReturnedClassExtendBody: any | undefined;
	public classBodyAcornVariableName: string | undefined;
	private readonly syntaxAnalyser: ISyntaxAnalyser;

	constructor(className: string, syntaxAnalyser: ISyntaxAnalyser, parser: UI5JSParser, documentText?: string) {
		super(className, parser);

		this.syntaxAnalyser = syntaxAnalyser;
		this.fsPath = this.parser.fileReader.getClassFSPathFromClassName(this.className) ?? "";
		this._readFileContainingThisClassCode(documentText); //todo: rename. not always reading anyore.
		this.UIDefine = this._getUIDefine();
		this.acornClassBody = this._getThisClassBodyAcorn();
		this._fillParentClassName();
		this._fillUI5Metadata();
		this._fillMethodsAndFields();
		this._enrichMemberInfoWithJSDocs();
		this._enrichMethodParamsWithHungarianNotation();
		this._fillIsAbstract();
		this._enrichVariablesWithJSDocTypesAndVisibility();
	}

	getMembers(): ICustomMember<any>[] {
		return super.getMembers() as ICustomMember<any>[];
	}

	protected _fillIsAbstract() {
		this.abstract = !!this.methods.find(method => method.abstract) || !!this.fields.find(field => field.abstract);
	}

	private _enrichMemberInfoWithJSDocs() {
		if (this.acornClassBody) {
			//instance methods
			let methods =
				this.acornClassBody.properties?.filter(
					(node: any) =>
						node.value.type === "FunctionExpression" || node.value.type === "ArrowFunctionExpression"
				) || [];

			const fields =
				this.acornClassBody.properties?.filter(
					(node: any) =>
						node.value.type !== "FunctionExpression" && node.value.type !== "ArrowFunctionExpression"
				) || [];

			//static methods
			//TODO: Move this
			const UIDefineBody = this.fileContent?.body[0]?.expression?.arguments[1]?.body?.body;
			if (UIDefineBody && this.classBodyAcornVariableName) {
				const thisClassVariableAssignments: any[] = UIDefineBody.filter((node: any) => {
					return (
						node.type === "ExpressionStatement" &&
						(node.expression?.left?.object?.name === this.classBodyAcornVariableName ||
							node.expression?.left?.object?.object?.name === this.classBodyAcornVariableName)
					);
				});

				const staticMethods = thisClassVariableAssignments
					.filter(node => {
						const assignmentBody = node.expression.right;
						return (
							assignmentBody.type === "ArrowFunctionExpression" ||
							assignmentBody.type === "FunctionExpression"
						);
					})
					.map(node => ({
						key: {
							name: node.expression.left.property.name,
							start: node.expression.left.property.start,
							end: node.expression.left.property.end,
							type: "Identifier"
						},
						value: node.expression.right,
						start: node.expression.left.object.start,
						end: node.expression.right.end,
						type: "Property"
					}));
				methods = methods.concat(staticMethods);
			}

			this.acornMethodsAndFields = this.acornMethodsAndFields.concat(methods);

			methods?.forEach((method: any) => {
				const methodName = method.key.name || method.key.value;
				const params = method.value.params;
				const comment = this.comments.find(comment => {
					const positionDifference = method.start - comment.end;
					return positionDifference < 15 && positionDifference > 0;
				});
				if (comment) {
					const paramTags = comment.jsdoc?.tags?.filter((tag: any) => tag.tag === "param");
					const returnTag = comment.jsdoc?.tags?.find(
						(tag: any) => tag.tag === "return" || tag.tag === "returns"
					);
					const asyncTag = comment.jsdoc?.tags?.find((tag: any) => tag.tag === "async");
					const isPrivate = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "private");
					const isPublic = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "public");
					const isProtected = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "protected");
					const isIgnored = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "ui5ignore");
					const isAbstract = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "abstract");
					const isStatic = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "static");
					const isDeprecated = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "deprecated");

					const UIMethod = this.methods.find(method => method.name === methodName);
					if (paramTags && UIMethod) {
						paramTags.forEach((tag: any) => {
							this._fillParamJSTypesFromTag(tag, params, UIMethod);
						});
					}

					if (UIMethod) {
						if (isPrivate || isPublic || isProtected) {
							UIMethod.visibility = isPrivate
								? "private"
								: isProtected
								? "protected"
								: isPublic
								? "public"
								: UIMethod.visibility;
						}
						if (asyncTag) {
							UIMethod.returnType = "Promise";
						}
						if (returnTag) {
							UIMethod.returnType = returnTag.type;
						}
						if (comment.jsdoc) {
							UIMethod.description = comment.jsdoc.description;
						}

						if (isIgnored) {
							UIMethod.ui5ignored = true;
						}

						if (isAbstract) {
							UIMethod.abstract = true;
						}

						if (isStatic) {
							UIMethod.static = true;
						}

						if (isDeprecated) {
							UIMethod.deprecated = true;
						}

						if (paramTags) {
							UIMethod.params.forEach((param, i) => {
								const jsDocParam = paramTags[i];
								if (jsDocParam) {
									param.isOptional = jsDocParam.optional;
								}
							});
						}
					}
				}
			});

			fields.forEach((field: any) => {
				const fieldName = field.key.name || field.key.value;
				const comment = this.comments.find(comment => {
					const positionDifference = field.start - comment.end;
					return positionDifference < 15 && positionDifference > 0;
				});
				if (comment) {
					const isPrivate = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "private");
					const isPublic = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "public");
					const isProtected = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "protected");
					const fieldType = comment.jsdoc?.tags?.find((tag: any) => tag.tag === "type");
					const ui5ignored = comment.jsdoc?.tags?.find((tag: any) => tag.tag === "ui5ignore");
					const isAbstract = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "abstract");
					const isStatic = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "static");
					const isDeprecated = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "deprecated");
					const UIField = this.fields.find(field => field.name === fieldName);
					if (UIField) {
						if (isPrivate || isPublic || isProtected) {
							UIField.visibility = isPrivate
								? "private"
								: isProtected
								? "protected"
								: isPublic
								? "public"
								: UIField.visibility;
						}

						if (comment.jsdoc) {
							UIField.description = comment.jsdoc.description;
						}

						if (fieldType) {
							UIField.type = fieldType.type;
						}

						if (ui5ignored) {
							UIField.ui5ignored = true;
						}

						if (isAbstract) {
							UIField.abstract = true;
						}

						if (isStatic) {
							UIField.static = true;
						}

						if (isDeprecated) {
							UIField.deprecated = true;
						}
					}
				}
			});
		}
	}

	private _fillParamJSTypesFromTag(tag: any, params: any[], method: ICustomClassUIMethod) {
		const tagNameParts = tag.name.split(".");
		if (tagNameParts.length > 1) {
			const paramName = tagNameParts.shift();
			const param = params.find((param: any) => param.name === paramName);
			if (param) {
				if (!param.customData) {
					param.customData = {};
				}
				this._fillFieldsRecursively(param.customData, tagNameParts, tag);
			}
		} else {
			const param = params.find((param: any) => param.name === tag.name);
			if (param) {
				param.jsType = tag.type;
				const UIParam = method.params.find(param => param.name === tag.name);
				if (UIParam && param.jsType) {
					UIParam.type = param.jsType;
				}
			}
		}
	}

	private _fillFieldsRecursively(object: any, keys: string[], tag: any) {
		const key = keys.shift();
		if (key) {
			object[key] = typeof object[key] !== "object" ? {} : object[key];

			if (keys.length > 0) {
				this._fillFieldsRecursively(object[key], keys, tag);
			} else {
				object[key] = tag.type;
			}
		}
	}

	private _enrichMethodParamsWithHungarianNotation() {
		this.methods.forEach(method => {
			method.params.forEach(param => {
				if (param.type === "any" || !param.type) {
					param.type = CustomUIClass.getTypeFromHungarianNotation(param.name) || "any";
				}
			});
		});
	}

	private _readFileContainingThisClassCode(documentText?: string) {
		if (!documentText) {
			documentText = this.parser.fileReader.getDocumentTextFromCustomClassName(this.className);
		}
		this.classText = documentText || "";
		if (documentText) {
			try {
				this.fileContent = acornLoose.parse(documentText, {
					ecmaVersion: 11,
					locations: true,
					onComment: (
						isBlock: boolean,
						text: string,
						start: number,
						end: number,
						startLoc: IAcornPosition,
						endLoc: IAcornPosition
					) => {
						if (isBlock && text?.startsWith("*")) {
							this.comments.push({
								text: text,
								start: start,
								end: end,
								jsdoc: commentParser.parse(`/*${text}*/`)[0],
								loc: {
									start: startLoc,
									end: endLoc
								}
							});
						}
					}
				});
			} catch (error) {
				console.error(error);
				this.fileContent = null;
			}
		} else {
			this.classExists = false;
		}
	}

	protected _getUIDefine() {
		let UIDefine: IUIDefine[] = [];

		if (this.fileContent) {
			const args = this.fileContent?.body[0]?.expression?.arguments;
			if (args && args.length >= 2) {
				const UIDefinePaths: string[] = args[0].elements?.map((part: any) => part.value) || [];
				const UIDefineClassNames: string[] = args[1].params?.map((part: any) => part.name) || [];
				UIDefine = UIDefinePaths.filter(path => !!path).map((classPath, index): IUIDefine => {
					return {
						path: classPath,
						className: UIDefineClassNames[index],
						classNameDotNotation: this._generateClassNameDotNotationFor(classPath),
						start: args[0].elements[index].start,
						end: args[0].elements[index].end,
						node: args[0].elements[index]
					};
				});
			}
		}

		return UIDefine;
	}

	private _generateClassNameDotNotationFor(classPath: string) {
		let className = classPath.replace(/\//g, ".");

		if (classPath?.startsWith(".")) {
			const manifest = this.parser.fileReader.getManifestForClass(this.className);

			if (manifest && this.fsPath) {
				const normalizedManifestPath = path.normalize(manifest.fsPath);
				const importClassPath = path.resolve(path.dirname(this.fsPath), classPath);
				const relativeToManifest = path.relative(normalizedManifestPath, importClassPath);
				const pathRelativeToManifestDotNotation = relativeToManifest.split(path.sep).join(".");
				className = `${manifest.componentName}.${pathRelativeToManifestDotNotation}`;
			}
		}

		if (className.endsWith(".controller")) {
			className = className.substring(0, className.length - ".controller".length);
		}

		return className;
	}

	private _getThisClassBodyAcorn() {
		const body = this.fileContent;
		let classBody: any;

		const returnKeyword = this._getReturnKeywordFromBody();
		if (returnKeyword && body) {
			classBody = this._getClassBodyFromPartAcorn(returnKeyword.argument);
		}

		return classBody;
	}

	private _getReturnKeywordFromBody() {
		let returnKeyword;
		const UIDefineBody = this.getUIDefineAcornBody();

		if (UIDefineBody) {
			returnKeyword = UIDefineBody.find((body: any) => body.type === "ReturnStatement");
		}

		return returnKeyword;
	}

	private _getClassBodyFromPartAcorn(part: any): any {
		const bodyParts = this.getUIDefineAcornBody();
		if (!part || !bodyParts) {
			return null;
		}

		let classBody: any;

		if (part.type === "CallExpression") {
			classBody = this._getClassBodyFromClassExtendAcorn(part);
			this.acornReturnedClassExtendBody = part;

			if (classBody) {
				if (part.callee.object.name) {
					this._parentVariableName = part.callee.object.name;
				} else if (part.callee.object.object?.name === "sap" && part.callee.object.property?.name === "ui") {
					this.parentClassNameDotNotation = this._getParentNameFromManifest() || "";
				}
			}
		} else if (part.type === "ObjectExpression") {
			classBody = part;
		} else if (part.type === "Identifier") {
			const variable = bodyParts
				.filter((body: any) => body.type === "VariableDeclaration")
				.find((variable: any) =>
					variable.declarations.find((declaration: any) => declaration.id.name === part.name)
				);

			if (variable) {
				const neededDeclaration = variable.declarations.find(
					(declaration: any) => declaration.id.name === part.name
				);
				classBody = this._getClassBodyFromPartAcorn(neededDeclaration.init);
				this.acornReturnedClassExtendBody = neededDeclaration.init;
				this.classBodyAcornVariableName = part.name;
			}
		}

		return classBody;
	}

	private _getParentNameFromManifest() {
		let parentName: string | undefined;
		const manifest = this.parser.fileReader.getManifestForClass(this.className);
		if (
			manifest?.content &&
			manifest?.content["sap.ui5"]?.extends?.extensions &&
			manifest?.content["sap.ui5"]?.extends?.extensions["sap.ui.controllerExtensions"]
		) {
			const mControllerExtensions = manifest.content["sap.ui5"].extends.extensions["sap.ui.controllerExtensions"];
			parentName = Object.keys(mControllerExtensions).find(sControllerName => {
				return mControllerExtensions[sControllerName].controllerName === this.className;
			});
		}

		return parentName;
	}

	private _getClassBodyFromClassExtendAcorn(part: any) {
		let classBody: any;

		if (this._isThisPartAClassBodyAcorn(part)) {
			classBody = part.arguments[1];
		}

		return classBody;
	}

	private _isThisPartAClassBodyAcorn(part: any) {
		const propertyName = part?.callee?.property?.name;

		return propertyName === "extend" || propertyName === "declareStaticClass" || propertyName === "controller";
	}

	public isAssignmentStatementForThisVariable(node: any) {
		return (
			node.type === "AssignmentExpression" &&
			node.operator === "=" &&
			node.left?.type === "MemberExpression" &&
			node.left?.property?.name &&
			node.left?.object?.type === "ThisExpression"
		);
	}
	protected _fillMethods(): ICustomClassMethod<any>[] {
		return [];
	}
	protected _fillFields(): ICustomClassField<any>[] {
		return [];
	}
	protected _fillParentClassName(): void {
		if (this._parentVariableName) {
			const parentClassUIDefine = this.UIDefine.find(UIDefine => UIDefine.className === this._parentVariableName);
			if (parentClassUIDefine) {
				this.parentClassNameDotNotation = parentClassUIDefine.classNameDotNotation;
			}
		}
	}
	protected _fillMethodsAndFields() {
		if (this.acornClassBody?.properties) {
			this.acornClassBody.properties.forEach((property: any) => {
				const name = property.key?.name || property.key?.value;
				if (
					property.value?.type === "FunctionExpression" ||
					property.value?.type === "ArrowFunctionExpression"
				) {
					const method: ICustomClassUIMethod = {
						name: name,
						params: this._generateParamTextForMethod(property.value.params),
						returnType: property.returnType || property.value.async ? "Promise" : "void",
						position: property.start,
						description: "",
						visibility: name?.startsWith("_") ? "private" : "public",
						acornParams: property.value.params,
						node: property.value,
						isEventHandler: false,
						owner: this.className,
						loc: property.key.loc,
						static: false,
						abstract: false,
						deprecated: false,
						ui5ignored: false,
						mentionedInTheXMLDocument: false
					};
					this.methods.push(method);
				} else if (property.value?.type === "Identifier" || property.value?.type === "Literal") {
					this.fields.push({
						name: name,
						type: property.jsType,
						node: property,
						description: property.jsType || "",
						visibility: name?.startsWith("_") ? "private" : "public",
						owner: this.className,
						loc: property.key.loc,
						static: false,
						abstract: false,
						deprecated: false,
						ui5ignored: false,
						mentionedInTheXMLDocument: false
					});
					this.acornMethodsAndFields.push(property);
				} else if (property.value?.type === "ObjectExpression") {
					this.fields.push({
						name: name,
						type: "map",
						description: "map",
						node: property,
						customData: this._generateCustomDataForObject(property.value),
						visibility: name?.startsWith("_") ? "private" : "public",
						owner: this.className,
						loc: property.key.loc,
						static: false,
						abstract: false,
						deprecated: false,
						ui5ignored: false,
						mentionedInTheXMLDocument: false
					});
					this.acornMethodsAndFields.push(property);
				} else if (property.value?.type === "MemberExpression") {
					this.fields.push({
						name: name,
						type: undefined,
						description: "",
						node: property,
						visibility: name?.startsWith("_") ? "private" : "public",
						owner: this.className,
						loc: property.key.loc,
						static: false,
						abstract: false,
						deprecated: false,
						ui5ignored: false,
						mentionedInTheXMLDocument: false
					});
					this.acornMethodsAndFields.push(property);
				} else if (property.value?.type === "ArrayExpression") {
					this.fields.push({
						name: name,
						type: "any[]",
						description: "",
						node: property,
						visibility: name?.startsWith("_") ? "private" : "public",
						owner: this.className,
						loc: property.key.loc,
						static: false,
						abstract: false,
						deprecated: false,
						ui5ignored: false,
						mentionedInTheXMLDocument: false
					});
					this.acornMethodsAndFields.push(property);
				} else if (property.value?.type === "NewExpression") {
					this.fields.push({
						name: name,
						type: undefined,
						description: "",
						node: property,
						visibility: name?.startsWith("_") ? "private" : "public",
						owner: this.className,
						loc: property.key.loc,
						static: false,
						abstract: false,
						deprecated: false,
						ui5ignored: false,
						mentionedInTheXMLDocument: false
					});
					this.acornMethodsAndFields.push(property);
				}
			});
			this.acornClassBody.properties?.forEach((property: any) => {
				if (
					property.value?.type === "FunctionExpression" ||
					property.value?.type === "ArrowFunctionExpression"
				) {
					const assignmentExpressions = this.syntaxAnalyser
						.expandAllContent(property.value.body)
						.filter((node: any) => node.type === "AssignmentExpression");
					assignmentExpressions?.forEach((node: any) => {
						if (this.isAssignmentStatementForThisVariable(node)) {
							const field = this.fields.find(field => field.name === node.left.property.name);
							if (field) {
								field.type = field.type || node.left.property.name.jsType;
								field.node = node.left;
							} else {
								this.fields.push({
									name: node.left.property.name,
									type: node.left.property.name.jsType,
									description: node.left.property.name.jsType || "",
									visibility: node.left.property.name?.startsWith("_") ? "private" : "public",
									node: node.left,
									owner: this.className,
									loc: node.left.property.loc,
									static: false,
									abstract: false,
									deprecated: false,
									ui5ignored: false,
									mentionedInTheXMLDocument: false
								});
							}
						}
					});
				}
			});

			this._fillMethodsAndFieldsFromPrototype();

			//remove duplicates
			this.fields = this.fields.reduce((accumulator: ICustomClassUIField[], field: ICustomClassUIField) => {
				const existingField = accumulator.find(accumulatedField => accumulatedField.name === field.name);
				if (existingField && field.type && !existingField.type) {
					accumulator[accumulator.indexOf(existingField)] = field;
				} else if (!existingField) {
					accumulator.push(field);
				}
				return accumulator;
			}, []);

			this.fields.push({
				name: "prototype",
				description: "Prototype of the class",
				type: this.className,
				visibility: "public",
				owner: this.className,
				static: false,
				abstract: false,
				deprecated: false,
				ui5ignored: false,
				mentionedInTheXMLDocument: false
			});
		}

		this._fillMethodsFromMetadata();

		const constructorMethod = this.methods.find(method => method.name === "constructor");
		if (constructorMethod) {
			constructorMethod.returnType = this.className;
		}
	}

	private _generateParamTextForMethod(acornParams: any[]) {
		const params: IUIMethodParam[] = acornParams.map((param: any) => {
			let name = "";
			if (param.type === "Identifier") {
				name = param.name || "Unknown";
			} else if (param.type === "AssignmentPattern") {
				name = param.left?.name || "Unknown";
			} else {
				name = "Unknown";
			}

			return {
				name: name,
				description: "",
				type: param.jsType || "any",
				isOptional: false
			};
		});

		return params;
	}

	private _generateCustomDataForObject(node: any, looseObject: ILooseObject = {}) {
		node.properties?.forEach((property: any) => {
			looseObject[property.key.name] = {};
			if (property.value.type === "ObjectExpression") {
				this._generateCustomDataForObject(property.value, looseObject[property.key.name]);
			}
		});

		return looseObject;
	}

	public getUIDefineAcornBody() {
		let UIDefineBody;
		const body = this.fileContent;

		const UIDefineBodyExists =
			this.fileContent?.body &&
			this.fileContent?.body[0]?.expression?.arguments &&
			(body?.body[0]?.expression?.arguments[1]?.body?.body ||
				body?.body[0]?.expression?.arguments[2]?.body?.body);

		if (UIDefineBodyExists) {
			UIDefineBody =
				this.fileContent?.body[0]?.expression?.arguments[1]?.body?.body ||
				this.fileContent?.body[0]?.expression?.arguments[2]?.body?.body;
		}

		return UIDefineBody;
	}

	private _fillMethodsAndFieldsFromPrototype() {
		const UIDefineBody = this.getUIDefineAcornBody();

		if (UIDefineBody && this.classBodyAcornVariableName) {
			const thisClassVariableAssignments: any[] = UIDefineBody.filter((node: any) => {
				return (
					node.type === "ExpressionStatement" &&
					(node.expression?.left?.object?.name === this.classBodyAcornVariableName ||
						node.expression?.left?.object?.object?.name === this.classBodyAcornVariableName)
				);
			});

			thisClassVariableAssignments?.forEach(node => {
				const assignmentBody = node.expression?.right;
				const isMethod =
					assignmentBody?.type === "ArrowFunctionExpression" || assignmentBody?.type === "FunctionExpression";
				const isField = !isMethod;

				const name = node?.expression?.left?.property?.name;
				const isStatic = node.expression?.left?.object?.property?.name !== "prototype";
				if (isMethod) {
					const method: ICustomClassUIMethod = {
						name: name,
						params: assignmentBody.params.map((param: any) => ({
							name: param.name,
							description: `${param.name} parameter`,
							type: param.jsType || ""
						})),
						returnType: assignmentBody.returnType || assignmentBody.async ? "Promise" : "void",
						position: node.expression.left.property.start,
						description: "",
						visibility: name?.startsWith("_") ? "private" : "public",
						acornParams: assignmentBody.params,
						node: assignmentBody,
						isEventHandler: false,
						owner: this.className,
						loc: node.expression.left.property.loc,
						static: isStatic,
						abstract: false,
						deprecated: false,
						ui5ignored: false,
						mentionedInTheXMLDocument: false
					};
					this.methods.push(method);
				} else if (isField) {
					this.fields.push({
						name: name,
						visibility: name?.startsWith("_") ? "private" : "public",
						type: typeof assignmentBody.value,
						description: assignmentBody.jsType || "",
						node: node.expression.left,
						owner: this.className,
						loc: node.expression.left.property.loc,
						static: isStatic,
						abstract: false,
						deprecated: false,
						ui5ignored: false,
						mentionedInTheXMLDocument: false
					});
				}
			});
		}
	}

	public static generateDescriptionForMethod(method: IUIMethod) {
		return `(${method.params.map(param => param.name).join(", ")}) : ${
			method.returnType ? method.returnType : "void"
		}`;
	}

	public fillTypesFromHungarionNotation() {
		this.fields.forEach(field => {
			if (!field.type) {
				field.type = CustomUIClass.getTypeFromHungarianNotation(field.name);
			}
		});
	}

	public static getTypeFromHungarianNotation(variable = ""): string | undefined {
		let type;

		if (variable.length >= 2) {
			const map: ILooseObject = {
				$: "Element",
				o: "object",
				a: "any[]",
				i: "int",
				f: "float",
				m: "map",
				s: "string",
				b: "boolean",
				p: "Promise",
				d: "Date",
				r: "RegExp",
				v: "any",
				fn: "function"
			};

			variable = variable.replace("_", "").replace("this.", "");
			const firstChar = variable[0];
			const secondChar = variable[1];
			if (firstChar && secondChar && map[firstChar] && secondChar === secondChar.toUpperCase()) {
				type = map[firstChar];
			}
		}

		return type;
	}

	private _fillMethodsFromMetadata() {
		const additionalMethods: ICustomClassUIMethod[] = [];

		this._fillPropertyMethods(additionalMethods);
		this._fillAggregationMethods(additionalMethods);
		this._fillEventMethods(additionalMethods);
		this._fillAssociationMethods(additionalMethods);

		this.methods = this.methods.concat(additionalMethods);
	}

	private _fillPropertyMethods(aMethods: ICustomClassUIMethod[]) {
		this.properties?.forEach(property => {
			const propertyWithFirstBigLetter = `${property.name[0].toUpperCase()}${property.name.substring(
				1,
				property.name.length
			)}`;
			const getterName = `get${propertyWithFirstBigLetter}`;
			const setterName = `set${propertyWithFirstBigLetter}`;

			aMethods.push({
				name: getterName,
				description: `Getter for property ${property.name}`,
				params: [],
				returnType: property.type || "void",
				visibility: property.visibility,
				isEventHandler: false,
				owner: this.className,
				static: false,
				abstract: false,
				deprecated: false,
				mentionedInTheXMLDocument: false,
				ui5ignored: false
			});

			aMethods.push({
				name: setterName,
				description: `Setter for property ${property.name}`,
				params: [
					{
						name: `v${propertyWithFirstBigLetter}`,
						type: "any",
						description: "Property for setting its value",
						isOptional: false
					}
				],
				returnType: this.className,
				visibility: property.visibility,
				isEventHandler: false,
				owner: this.className,
				static: false,
				abstract: false,
				deprecated: false,
				mentionedInTheXMLDocument: false,
				ui5ignored: false
			});
		});
	}

	private _fillAggregationMethods(additionalMethods: ICustomClassUIMethod[]) {
		interface method {
			name: string;
			params: IUIMethodParam[];
			returnType: string;
		}
		this.aggregations?.forEach(aggregation => {
			if (!aggregation.singularName) {
				return;
			}
			const aggregationWithFirstBigLetter = `${aggregation.singularName[0].toUpperCase()}${aggregation.singularName.substring(
				1,
				aggregation.singularName.length
			)}`;

			let aMethods: method[] = [];
			if (aggregation.multiple) {
				aMethods = [
					{
						name: `get${aggregationWithFirstBigLetter}s`,
						returnType: `${aggregation.type}[]`,
						params: []
					},
					{
						name: `add${aggregationWithFirstBigLetter}`,
						returnType: this.className,
						params: [
							{
								name: `v${aggregationWithFirstBigLetter}`,
								type: aggregation.type,
								description: aggregation.type,
								isOptional: false
							}
						]
					},
					{
						name: `insert${aggregationWithFirstBigLetter}`,
						returnType: this.className,
						params: [
							{
								name: `v${aggregationWithFirstBigLetter}`,
								type: aggregation.type,
								description: aggregation.type,
								isOptional: false
							},
							{
								name: `v${aggregationWithFirstBigLetter}`,
								type: "number",
								description: "index the item should be inserted at",
								isOptional: false
							}
						]
					},
					{
						name: `indexOf${aggregationWithFirstBigLetter}`,
						returnType: "int",
						params: [
							{
								name: `v${aggregationWithFirstBigLetter}`,
								type: aggregation.type,
								description: aggregation.type,
								isOptional: false
							}
						]
					},
					{
						name: `remove${aggregationWithFirstBigLetter}`,
						returnType: `${aggregation.type}`,
						params: [
							{
								name: `v${aggregationWithFirstBigLetter}`,
								type: aggregation.type,
								description: aggregation.type,
								isOptional: false
							}
						]
					},
					{
						name: `removeAll${aggregationWithFirstBigLetter}s`,
						returnType: `${aggregation.type}[]`,
						params: []
					},
					{
						name: `destroy${aggregationWithFirstBigLetter}s`,
						returnType: this.className,
						params: []
					},
					{
						name: `bind${aggregationWithFirstBigLetter}s`,
						returnType: this.className,
						params: [
							{
								name: "oBindingInfo",
								type: "object",
								description: "The binding information",
								isOptional: false
							}
						]
					},
					{
						name: `unbind${aggregationWithFirstBigLetter}s`,
						returnType: this.className,
						params: []
					}
				];
			} else {
				aMethods = [
					{
						name: `get${aggregationWithFirstBigLetter}`,
						returnType: `${aggregation.type}`,
						params: []
					},
					{
						name: `set${aggregationWithFirstBigLetter}`,
						returnType: this.className,
						params: [
							{
								name: `v${aggregationWithFirstBigLetter}`,
								type: aggregation.type,
								description: aggregation.type,
								isOptional: false
							}
						]
					},
					{
						name: `bind${aggregationWithFirstBigLetter}`,
						returnType: this.className,
						params: [
							{
								name: "oBindingInfo",
								type: "object",
								description: "The binding information",
								isOptional: false
							}
						]
					},
					{
						name: `unbind${aggregationWithFirstBigLetter}`,
						returnType: this.className,
						params: []
					}
				];
			}

			aMethods.forEach(method => {
				additionalMethods.push({
					name: method.name,
					description: `Generic method from "${aggregation.name}" aggregation`,
					params: method.params,
					returnType: method.returnType,
					visibility: aggregation.visibility,
					isEventHandler: false,
					owner: this.className,
					static: false,
					abstract: false,
					deprecated: false,
					mentionedInTheXMLDocument: false,
					ui5ignored: false
				});
			});
		});
	}

	private _fillEventMethods(aMethods: ICustomClassUIMethod[]) {
		this.events?.forEach(event => {
			const eventWithFirstBigLetter = `${event.name[0].toUpperCase()}${event.name.substring(
				1,
				event.name.length
			)}`;
			const aEventMethods = [
				{
					name: `fire${eventWithFirstBigLetter}`,
					params: [
						{
							name: "mEventParams",
							type: "map",
							isOptional: true,
							description: "Event params"
						}
					]
				},
				{
					name: `attach${eventWithFirstBigLetter}`,
					params: [
						{
							name: "fnHandler",
							type: "function",
							isOptional: false,
							description: "Event Handler"
						},
						{
							name: "oContext",
							type: "object",
							isOptional: true,
							description: "context of the event handler"
						}
					]
				},
				{
					name: `detach${eventWithFirstBigLetter}`,
					params: [
						{
							name: "fnHandler",
							type: "function",
							isOptional: false,
							description: "Event Handler"
						},
						{
							name: "oContext",
							type: "object",
							isOptional: true,
							description: "context of the event handler"
						}
					]
				}
			];

			aEventMethods?.forEach(eventMethod => {
				aMethods.push({
					name: eventMethod.name,
					description: `Generic method for event ${event.name}`,
					params: eventMethod.params,
					returnType: this.className,
					visibility: event.visibility,
					isEventHandler: false,
					owner: this.className,
					static: false,
					abstract: false,
					deprecated: false,
					mentionedInTheXMLDocument: false,
					ui5ignored: false
				});
			});
		});
	}

	private _fillAssociationMethods(additionalMethods: ICustomClassUIMethod[]) {
		this.associations?.forEach(association => {
			const associationWithFirstBigLetter = `${association.singularName[0].toUpperCase()}${association.singularName.substring(
				1,
				association.singularName.length
			)}`;

			let aMethods = [];
			if (association.multiple) {
				aMethods = [
					{
						name: `get${associationWithFirstBigLetter}`,
						params: []
					},
					{
						name: `add${associationWithFirstBigLetter}`,
						params: [
							{
								name: `v${associationWithFirstBigLetter}`,
								type: association.type || "any",
								isOptional: false,
								description: `Add ${associationWithFirstBigLetter}`
							}
						]
					},
					{
						name: `remove${associationWithFirstBigLetter}`,
						params: [
							{
								name: `v${associationWithFirstBigLetter}`,
								type: association.type || "any",
								isOptional: false,
								description: `Remove ${associationWithFirstBigLetter}`
							}
						]
					},
					{
						name: `removeAll${associationWithFirstBigLetter}s`,
						params: []
					}
				];
			} else {
				aMethods = [
					{
						name: `get${associationWithFirstBigLetter}`,
						params: []
					},
					{
						name: `set${associationWithFirstBigLetter}`,
						params: [
							{
								name: `v${associationWithFirstBigLetter}`,
								type: association.type || "any",
								isOptional: false,
								description: `Set ${associationWithFirstBigLetter}`
							}
						]
					}
				];
			}

			aMethods?.forEach(method => {
				additionalMethods.push({
					name: method.name,
					description: `Generic method from ${association.name} association`,
					params: method.params,
					returnType: association.type || this.className,
					visibility: association.visibility,
					isEventHandler: false,
					owner: this.className,
					static: false,
					abstract: false,
					deprecated: false,
					mentionedInTheXMLDocument: false,
					ui5ignored: false
				});
			});
		});
	}

	protected _fillUI5Metadata() {
		if (this.acornClassBody?.properties) {
			const metadataExists = !!this.acornClassBody.properties?.find(
				(property: any) => property.key?.name === "metadata" || property.key?.value === "metadata"
			);
			const customMetadataExists = !!this.acornClassBody.properties?.find(
				(property: any) => property.key?.name === "customMetadata" || property.key?.value === "customMetadata"
			);

			if (metadataExists) {
				const metadataObject = this.acornClassBody.properties?.find(
					(property: any) => property.key?.name === "metadata" || property.key?.value === "metadata"
				);

				this.aggregations = this._fillAggregations(metadataObject);
				this.events = this._fillEvents(metadataObject);
				this.properties = this._fillProperties(metadataObject);
				this.associations = this._fillAssociations(metadataObject);
				this.interfaces = this._fillInterfaces(metadataObject);
			}

			if (customMetadataExists) {
				const customMetadataObject = this.acornClassBody.properties?.find(
					(property: any) =>
						property.key?.name === "customMetadata" || property.key?.value === "customMetadata"
				);

				this.associations.push(...this._fillAssociations(customMetadataObject));
				this._fillCustomInterfaces(customMetadataObject);
			}
		}
	}

	protected _fillInterfaces(metadata: any) {
		const interfaces = metadata.value?.properties?.find((metadataNode: any) =>
			[metadataNode.key.name, metadataNode.key.value].includes("interfaces")
		);
		if (interfaces) {
			const interfaceNamesDotNotation = interfaces.value?.elements?.map((element: any) => element.value) || [];
			return interfaceNamesDotNotation;
		} else {
			return [];
		}
	}

	protected _fillCustomInterfaces(customMetadata: any) {
		const interfaces = customMetadata.value?.properties?.find((metadataNode: any) =>
			[metadataNode.key.name, metadataNode.key.value].includes("interfaces")
		);
		if (interfaces) {
			const interfaceNames: string[] = interfaces.value?.elements?.map((element: any) => element.name) || [];
			const interfaceNamesDotNotation = interfaceNames
				.filter(interfaceName => {
					return !!this.UIDefine.find(UIDefine => UIDefine.className === interfaceName);
				})
				.map(interfaceName => {
					return (
						this.UIDefine.find(UIDefine => UIDefine.className === interfaceName)?.classNameDotNotation || ""
					);
				});
			this.interfaces.push(...interfaceNamesDotNotation);
		}
	}

	protected _fillAggregations(metadata: any) {
		const aggregations = metadata.value?.properties?.find((metadataNode: any) =>
			[metadataNode.key.name, metadataNode.key.value].includes("aggregations")
		);

		if (!aggregations) {
			return [];
		}

		return (
			aggregations.value?.properties
				?.filter((node: any) => !!node.key.name || !!node.key.value)
				.map((aggregationNode: any) => {
					const aggregationName = aggregationNode.key.name || aggregationNode.key.value;
					const aggregationProps = aggregationNode.value.properties;

					let aggregationType: undefined | string = undefined;
					const aggregationTypeProp = aggregationProps?.find(
						(aggregationProperty: any) =>
							aggregationProperty.key.name === "type" || aggregationProperty.key.value === "type"
					);
					if (aggregationTypeProp) {
						aggregationType = aggregationTypeProp.value.value;
					}

					let multiple = true;
					const multipleProp = aggregationProps?.find(
						(aggregationProperty: any) =>
							aggregationProperty.key.name === "multiple" || aggregationProperty.key.value === "multiple"
					);
					if (multipleProp) {
						multiple = multipleProp.value.value;
					}

					let singularName = "";
					const singularNameProp = aggregationProps?.find(
						(aggregationProperty: any) =>
							aggregationProperty.key.name === "singularName" ||
							aggregationProperty.key.value === "singularName"
					);
					if (singularNameProp) {
						singularName = singularNameProp.value.value;
					}
					if (!singularName) {
						singularName = aggregationName;
					}

					let visibility = "public";
					const visibilityProp = aggregationProps?.find(
						(associationProperty: any) =>
							associationProperty.key.name === "visibility" ||
							associationProperty.key.value === "visibility"
					);
					if (visibilityProp) {
						visibility = visibilityProp.value.value;
					}

					const UIAggregations: IUIAggregation = {
						name: aggregationName,
						type: aggregationType || "any",
						multiple: multiple,
						singularName: singularName,
						description: "",
						visibility: visibility,
						default: false
					};
					return UIAggregations;
				}) || []
		);
	}

	protected _fillEvents(metadata: any) {
		const eventMetadataNode = metadata.value?.properties?.find(
			(metadataNode: any) => metadataNode.key.name === "events" || metadataNode.key.value === "events"
		);

		if (!eventMetadataNode) {
			return [];
		}
		const events = eventMetadataNode.value?.properties;
		return (
			events
				?.filter((node: any) => !!node.key.name || !!node.key.value)
				.map((eventNode: any) => {
					let visibility = "public";
					const visibilityProp = eventNode.value?.properties?.find(
						(node: any) => node.key.name === "visibility" || node.key.value === "visibility"
					);
					if (visibilityProp) {
						visibility = visibilityProp.value.value;
					}

					let eventParams: IUIEventParam[] = [];
					const params = eventNode.value?.properties?.find(
						(node: any) => node.key.name === "parameters" || node.key.value === "parameters"
					);
					if (params) {
						eventParams =
							params.value?.properties?.map((param: any) => {
								const type =
									param.value?.properties?.find(
										(param: any) => param.key.name === "type" || param.key.value === "type"
									)?.value?.value || "";
								const eventParam: IUIEventParam = {
									name: param.key.name || param.key.value,
									type: type
								};
								return eventParam;
							}) || [];
					}
					const UIEvent: IUIEvent = {
						name: eventNode.key.name || eventNode.key.value,
						description: "",
						visibility: visibility,
						params: eventParams
					};
					return UIEvent;
				}) || []
		);
	}

	protected _fillProperties(metadata: any) {
		const propertiesMetadataNode = metadata.value?.properties?.find(
			(metadataNode: any) => metadataNode.key.name === "properties" || metadataNode.key.value === "properties"
		);

		if (!propertiesMetadataNode) {
			return [];
		}
		const properties = propertiesMetadataNode?.value?.properties || [];
		return properties
			.filter((node: any) => !!node.key.name || !!node.key.value)
			.map((propertyNode: any) => {
				const propertyName = propertyNode.key.name || propertyNode.key.value;
				const propertyProps = propertyNode.value.properties;

				let propertyType: undefined | string = undefined;
				const propertyTypeProp = propertyProps?.find(
					(property: any) => property.key.name === "type" || property.key.value === "type"
				);
				if (propertyTypeProp) {
					propertyType = propertyTypeProp.value.value;
				}

				let visibility = "public";
				const visibilityProp = propertyProps?.find(
					(associationProperty: any) =>
						associationProperty.key.name === "visibility" || associationProperty.key.value === "visibility"
				);
				if (visibilityProp) {
					visibility = visibilityProp.value.value;
				}

				const UIProperties: IUIProperty = {
					name: propertyName,
					type: propertyType,
					visibility: visibility,
					description: "",
					typeValues: this.generateTypeValues(propertyType || "")
				};

				return UIProperties;
			});
	}

	protected _fillAssociations(metadata: any) {
		const associationMetadataNode = metadata.value?.properties?.find(
			(metadataNode: any) => metadataNode.key.name === "associations" || metadataNode.key.value === "associations"
		);

		if (!associationMetadataNode) {
			return [];
		}
		const associations = associationMetadataNode.value?.properties || [];
		return this.associations.concat(
			associations
				.filter((node: any) => !!node.key.name || !!node.key.value)
				.map((associationNode: any) => {
					const associationName = associationNode.key.name || associationNode.key.value;
					const associationProps = associationNode.value.properties;

					let associationType: undefined | string = undefined;
					const associationTypeProp = associationProps?.find(
						(associationProperty: any) =>
							associationProperty.key.name === "type" || associationProperty.key.value === "type"
					);
					if (associationTypeProp) {
						associationType = associationTypeProp.value.value;
					}

					let multiple = true;
					const multipleProp = associationProps?.find(
						(associationProperty: any) =>
							associationProperty.key.name === "multiple" || associationProperty.key.value === "multiple"
					);
					if (multipleProp) {
						multiple = multipleProp.value.value;
					}

					let singularName = "";
					const singularNameProp = associationProps?.find(
						(associationProperty: any) =>
							associationProperty.key.name === "singularName" ||
							associationProperty.key.value === "singularName"
					);
					if (singularNameProp) {
						singularName = singularNameProp.value.value;
					}
					if (!singularName) {
						singularName = associationName;
					}

					let visibility = "public";
					const visibilityProp = associationProps?.find(
						(associationProperty: any) =>
							associationProperty.key.name === "visibility" ||
							associationProperty.key.value === "visibility"
					);
					if (visibilityProp) {
						visibility = visibilityProp.value.value;
					}

					const UIAssociations: IUIAssociation = {
						name: associationName,
						type: associationType,
						multiple: multiple,
						singularName: singularName,
						description: "",
						visibility: visibility
					};
					return UIAssociations;
				})
		);
	}
	private _enrichVariablesWithJSDocTypesAndVisibility() {
		//TODO: merge this with logic in custom ui class?
		if (this.comments.length > 0) {
			const classLineColumn = LineColumn(this.classText);
			this.comments.forEach(comment => {
				const typeDoc = comment.jsdoc?.tags?.find((tag: any) => {
					return tag.tag === "type";
				});
				const visibility = ["protected", "public", "private"];
				const ui5ignored = comment.jsdoc?.tags?.find((tag: any) => tag.tag === "ui5ignore");
				const isAbstract = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "abstract");
				const isStatic = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "static");
				const isDeprecated = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "deprecated");
				const visibilityDoc = comment.jsdoc?.tags?.find((tag: any) => {
					return visibility.includes(tag.tag);
				});
				if (typeDoc || visibilityDoc || ui5ignored || isAbstract || isStatic || isDeprecated) {
					const lineDifference = comment.loc.end.line - comment.loc.start.line;
					const nextLine = comment.loc.start.line + lineDifference + 1;
					const indexOfBottomLine = classLineColumn.toIndex({
						line: nextLine,
						col: comment.loc.start.column + 1
					});

					if (typeDoc) {
						const variableDeclaration = this.syntaxAnalyser.getAcornVariableDeclarationAtIndex(
							this,
							indexOfBottomLine
						);
						if (variableDeclaration?.declarations && variableDeclaration.declarations[0]) {
							variableDeclaration.declarations[0]._acornSyntaxAnalyserType = typeDoc.type;
						}
					}

					if (typeDoc || visibilityDoc || ui5ignored || isAbstract || isStatic || isDeprecated) {
						const assignmentExpression = this.syntaxAnalyser.getAcornAssignmentExpressionAtIndex(
							this,
							indexOfBottomLine
						);
						if (assignmentExpression) {
							const leftNode = assignmentExpression.left;
							if (
								leftNode?.object?.type === "ThisExpression" &&
								leftNode?.property?.type === "Identifier"
							) {
								const members = this.getMembers();
								const member = members.find(member => member.name === leftNode.property.name);
								if (member) {
									if (visibilityDoc) {
										member.visibility = visibilityDoc.tag;
									}
									if (typeDoc && member.node) {
										const field = member as ICustomClassUIField;
										field.type = typeDoc.type;
									}
									if (isStatic) {
										member.static = isStatic;
									}
									if (ui5ignored) {
										member.ui5ignored = true;
									}
									if (isDeprecated) {
										member.deprecated = true;
									}
									if (isAbstract) {
										member.abstract = true;
										this.abstract = true;
									}
								}
							}
						}
					}
				}
			});
		}
	}
}
