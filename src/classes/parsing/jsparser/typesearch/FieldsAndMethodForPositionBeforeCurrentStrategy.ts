import { IUI5Parser } from "../../../../parser/abstraction/IUI5Parser";
import { AbstractCustomClass } from "../../ui5class/AbstractCustomClass";
import { IFieldsAndMethods } from "../../ui5class/factory/IClassFactory";
import { CustomJSClass } from "../../ui5class/js/CustomJSClass";
import { TextDocument } from "../../util/textdocument/TextDocument";
import { ISyntaxAnalyser } from "../ISyntaxAnalyser";
import { FieldPropertyMethodGetterStrategy as FieldMethodGetterStrategy } from "./abstraction/FieldPropertyMethodGetterStrategy";

export class FieldsAndMethodForPositionBeforeCurrentStrategy extends FieldMethodGetterStrategy {
	private readonly syntaxAnalyser: ISyntaxAnalyser;
	constructor(syntaxAnalyser: ISyntaxAnalyser, parser: IUI5Parser<AbstractCustomClass>) {
		super(parser);
		this.syntaxAnalyser = syntaxAnalyser;
	}

	getFieldsAndMethods(document: TextDocument, position: number) {
		let fieldsAndMethods: IFieldsAndMethods | undefined;
		const className = this.parser.fileReader.getClassNameFromPath(document.fileName);
		const UIClassName = className && this.getClassNameOfTheVariableAtPosition(className, position);
		if (UIClassName) {
			fieldsAndMethods = this.destructureFieldsAndMethodsAccordingToMapParams(UIClassName);
			if (fieldsAndMethods && className !== fieldsAndMethods.className) {
				this._filterFieldsAndMethodsAccordingToAccessLevelModifiers(fieldsAndMethods);
			} else if (fieldsAndMethods) {
				this._filterFieldsAndMethodsAccordingToAccessLevelModifiers(fieldsAndMethods, [
					"private",
					"protected",
					"public"
				]);
			}
		}

		return fieldsAndMethods;
	}
	destructureFieldsAndMethodsAccordingToMapParams(className: string): IFieldsAndMethods | undefined {
		let fieldsAndMethods: IFieldsAndMethods | undefined;
		const isMap = className.includes("__map__");
		const classNamePartsFromMapParam = className.split("__mapparam__");

		if (isMap) {
			const isArray = className.endsWith("[]");
			if (isArray) {
				className = className.substring(0, className.length - 2);
			}
			const mapFields = className.split("__map__");
			mapFields.shift(); //remove class name
			fieldsAndMethods = {
				className: `map${isArray ? "[]" : ""}`,
				methods: [],
				fields: mapFields.map(field => ({
					name: field,
					description: field,
					type: "any",
					visibility: "public",
					owner: "",
					abstract: false,
					static: false,
					deprecated: false
				}))
			};
		} else if (classNamePartsFromMapParam.length > 1) {
			const className = classNamePartsFromMapParam.shift();
			if (className) {
				const mapFields = classNamePartsFromMapParam;
				const paramStructure = JSON.parse(mapFields[0]);
				const fieldString = mapFields[1] || "";
				const fields = fieldString.split(".");
				const correspondingObject = this._getCorrespondingObject(paramStructure, fields);
				fieldsAndMethods = {
					className: typeof correspondingObject === "object" ? "map" : correspondingObject,
					fields:
						typeof correspondingObject === "object"
							? Object.keys(correspondingObject).map(key => {
									return {
										description: key,
										name: key,
										visibility: "public",
										type:
											typeof paramStructure[key] === "string"
												? paramStructure[key]
												: typeof paramStructure[key],
										owner: "",
										abstract: false,
										static: false,
										deprecated: false
									};
							})
							: [],
					methods: []
				};
				if (typeof correspondingObject !== "object") {
					fieldsAndMethods = this.destructureFieldsAndMethodsAccordingToMapParams(correspondingObject);
				}
			}
		} else if (className.startsWith("Promise<")) {
			fieldsAndMethods = this.parser.classFactory.getFieldsAndMethodsForClass("Promise");
			fieldsAndMethods.className = className;
		} else {
			if (className.endsWith("[]")) {
				fieldsAndMethods = this.parser.classFactory.getFieldsAndMethodsForClass("array");
				fieldsAndMethods.className = className;
			} else {
				fieldsAndMethods = this.parser.classFactory.getFieldsAndMethodsForClass(className);
			}
		}

		return fieldsAndMethods;
	}

	private _getCorrespondingObject(paramStructure: any, fields: string[]): any {
		let returnObject;
		const field = fields.shift();
		if (field) {
			returnObject = this._getCorrespondingObject(paramStructure[field], fields);
		} else {
			returnObject = paramStructure;
		}

		return returnObject;
	}

	getClassNameOfTheVariableAtPosition(className: string, position: number) {
		return this.acornGetClassName(className, position);
	}

	acornGetClassName(className: string, position: number, clearStack = true, checkForLastPosition = false) {
		let classNameOfTheCurrentVariable;
		const stack = this.getStackOfNodesForPosition(className, position, checkForLastPosition);
		if (stack.length > 0) {
			classNameOfTheCurrentVariable = this.syntaxAnalyser.findClassNameForStack(
				stack,
				className,
				undefined,
				clearStack
			);
		}

		return classNameOfTheCurrentVariable;
	}

	getStackOfNodesForPosition(className: string, position: number, checkForLastPosition = false) {
		const stack: any[] = [];
		const UIClass = this.parser.classFactory.getUIClass(className);

		if (UIClass instanceof CustomJSClass) {
			const methodNode = UIClass.acornMethodsAndFields.find((node: any) => {
				return node.start < position && node.end >= position;
			})?.value;

			if (methodNode) {
				const methodBody = methodNode.body?.body || [methodNode];
				const methodsParams = methodNode?.params || [];
				const method = methodBody.concat(methodsParams);
				const nodeWithCurrentPosition = this.syntaxAnalyser.findAcornNode(method, position - 1);

				if (nodeWithCurrentPosition) {
					this._generateStackOfNodes(nodeWithCurrentPosition, position, stack, checkForLastPosition);
				}
			} else {
				const UIDefineBody = UIClass.getUIDefineAcornBody();
				if (UIDefineBody) {
					const nodeWithCurrentPosition = this.syntaxAnalyser.findAcornNode(UIDefineBody, position - 1);
					if (nodeWithCurrentPosition) {
						this._generateStackOfNodes(nodeWithCurrentPosition, position, stack, checkForLastPosition);
					}
				}
			}
		}

		return stack;
	}

	private _generateStackOfNodes(node: any, position: number, stack: any[], checkForLastPosition = false) {
		const nodeTypesToUnshift = [
			"CallExpression",
			"MemberExpression",
			"VariableDeclaration",
			"ThisExpression",
			"NewExpression",
			"Identifier",
			"AwaitExpression"
		];
		const positionIsCorrect = node.end < position || (checkForLastPosition && node.end === position);
		if (
			node &&
			positionIsCorrect &&
			nodeTypesToUnshift.indexOf(node.type) > -1 &&
			node.property?.name !== "✖" &&
			node.property?.name !== "prototype"
		) {
			stack.unshift(node);
		}

		const innerNode: any = this.syntaxAnalyser.findInnerNode(node, position);

		if (innerNode) {
			this._generateStackOfNodes(innerNode, position, stack, checkForLastPosition);
		}
	}
}
