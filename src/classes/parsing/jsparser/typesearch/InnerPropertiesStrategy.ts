import { IUI5Parser } from "../../../../parser/abstraction/IUI5Parser";
import ParserPool from "../../../../parser/pool/ParserPool";
import { AbstractCustomClass } from "../../ui5class/AbstractCustomClass";
import { IFieldsAndMethods } from "../../ui5class/factory/IClassFactory";
import { CustomJSClass } from "../../ui5class/js/CustomJSClass";
import { TextDocument } from "../../util/textdocument/TextDocument";
import { ISyntaxAnalyser } from "../ISyntaxAnalyser";
import { FieldPropertyMethodGetterStrategy } from "./abstraction/FieldPropertyMethodGetterStrategy";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "./FieldsAndMethodForPositionBeforeCurrentStrategy";

export class InnerPropertiesStrategy extends FieldPropertyMethodGetterStrategy {
	private readonly syntaxAnalyser: ISyntaxAnalyser;
	constructor(syntaxAnalyser: ISyntaxAnalyser, parser: IUI5Parser<AbstractCustomClass>) {
		super(parser);
		this.syntaxAnalyser = syntaxAnalyser;
	}

	getFieldsAndMethods(document: TextDocument, position: number) {
		const fieldsAndMethods: IFieldsAndMethods | undefined = this._acornGetPropertiesForParamsInCurrentPosition(
			document,
			position
		);

		return fieldsAndMethods;
	}

	private _acornGetPropertiesForParamsInCurrentPosition(document: TextDocument, position: number) {
		let fieldsAndMethods: IFieldsAndMethods | undefined;
		const currentClassName = this.parser.fileReader.getClassNameFromPath(document.fileName);

		if (currentClassName) {
			const stack = this.getStackOfNodesForInnerParamsForPosition(currentClassName, position);
			if (stack.length === 1 && stack[0].type === "NewExpression") {
				fieldsAndMethods = this._getFieldsAndMethodsForNewExpression(stack[0], document, position);
			} else if (stack.length === 1 && stack[0].type === "CallExpression") {
				fieldsAndMethods = this._getFieldsAndMethodsForCallExpression(stack[0], document, position);
			}
		}

		return fieldsAndMethods;
	}

	private _getFieldsAndMethodsForNewExpression(newExpression: any, document: TextDocument, position: number) {
		let fieldsAndMethods: IFieldsAndMethods | undefined;
		const currentClassName = this.parser.fileReader.getClassNameFromPath(document.fileName);
		if (position && currentClassName) {
			const argument = this.syntaxAnalyser.findAcornNode(newExpression.arguments, position);
			const indexOfArgument = newExpression.arguments.indexOf(argument);
			if (argument && argument.type === "ObjectExpression") {
				const positionBeforeCurrentStrategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(
					this.syntaxAnalyser,
					this.parser
				);
				const stack = positionBeforeCurrentStrategy.getStackOfNodesForPosition(
					currentClassName,
					newExpression.end + 1
				);
				const classNameOfCurrentNewExpression = this.syntaxAnalyser.findClassNameForStack(
					stack,
					currentClassName
				);
				if (classNameOfCurrentNewExpression) {
					const node = this.parser.nodeDAO.findNode(classNameOfCurrentNewExpression);
					const constructorParameters = node?.getMetadata()?.getRawMetadata()?.constructor?.parameters;
					if (constructorParameters) {
						const settings = constructorParameters.find((parameter: any) => parameter.name === "mSettings");
						if (settings) {
							const indexOfSettings = constructorParameters.indexOf(settings);
							if (indexOfSettings === indexOfArgument) {
								fieldsAndMethods = this._generatePropertyFieldsFor(classNameOfCurrentNewExpression);
							}
						}
					}
				}
			}
		}

		return fieldsAndMethods;
	}

	private _getFieldsAndMethodsForCallExpression(callExpression: any, document: TextDocument, position: number) {
		let fieldsAndMethods: IFieldsAndMethods | undefined;
		const currentClassName = this.parser.fileReader.getClassNameFromPath(document.fileName);
		if (currentClassName && position) {
			const argument = this.syntaxAnalyser.findAcornNode(callExpression.arguments, position);
			const indexOfArgument = callExpression.arguments.indexOf(argument);
			if (argument?.type === "ObjectExpression") {
				const positionBeforeCurrentStrategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(
					this.syntaxAnalyser,
					this.parser
				);
				const stack = positionBeforeCurrentStrategy.getStackOfNodesForPosition(
					currentClassName,
					callExpression.callee.end
				);
				const classNameOfCurrentObjectExpression = this.syntaxAnalyser.findClassNameForStack(
					stack,
					currentClassName
				);
				if (classNameOfCurrentObjectExpression) {
					const methodName = callExpression.callee?.property?.name;
					if (methodName) {
						const UIClass = <CustomJSClass>(
							this.parser.classFactory.getUIClass(classNameOfCurrentObjectExpression)
						);
						const UIMethod = UIClass.methods.find(method => method.name === methodName);
						if (UIMethod?.acornParams) {
							const acornParam = UIMethod.acornParams[indexOfArgument];
							const fields = this._generateFieldsFromArgument(argument, position);
							const objectForCompletionItems = this._getObjectFromObject(acornParam.customData, fields);
							if (acornParam && typeof objectForCompletionItems === "object") {
								fieldsAndMethods = {
									className: acornParam.jsType,
									methods: [],
									fields: Object.keys(objectForCompletionItems).map(key => {
										return {
											description: key,
											name: key,
											type:
												typeof objectForCompletionItems[key] === "string"
													? objectForCompletionItems[key]
													: typeof objectForCompletionItems[key],
											visibility: "public",
											owner: "",
											abstract: false,
											static: false,
											deprecated: false
										};
									})
								};
							}
						}
					}
				}
			} else if (argument?.type === "Literal" && indexOfArgument === 0) {
				const positionBeforeCurrentStrategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(
					this.syntaxAnalyser,
					this.parser
				);
				const className = positionBeforeCurrentStrategy.acornGetClassName(
					currentClassName,
					callExpression.callee.end
				);
				if (className === "sap.ui.base.Event" && callExpression.callee?.property?.name === "getParameter") {
					const eventHandlerData = this.syntaxAnalyser.getEventHandlerData(callExpression, currentClassName);
					if (eventHandlerData) {
						const parameters = this.syntaxAnalyser.getParametersOfTheEvent(
							eventHandlerData.eventName,
							eventHandlerData.className
						);
						if (parameters) {
							fieldsAndMethods = {
								className: "generic",
								methods: [],
								fields: parameters.map(parameter => {
									return {
										name: parameter.name,
										description: `${eventHandlerData.eventName} - ${parameter.name}: ${parameter.type}`,
										type: parameter.type,
										visibility: "public",
										owner: "",
										abstract: false,
										static: false,
										deprecated: false
									};
								})
							};
						}
					}
				} else if (className && callExpression.callee?.property?.name === "getModel") {
					let models = this._getManifestModels(document);
					const classModels = this._getCurrentClassModels(currentClassName);
					models.push(...classModels);
					models = models.reduce((accumulator: { type: string; name: string }[], model) => {
						const modelAlreadyAdded = !!accumulator.find(modelInArray => modelInArray.name === model.name);
						if (!modelAlreadyAdded) {
							accumulator.push(model);
						}

						return accumulator;
					}, []);

					fieldsAndMethods = {
						className: "generic",
						methods: [],
						fields: models.map(model => {
							return {
								name: model.name,
								description: model.type,
								type: "string",
								visibility: "public",
								owner: "",
								abstract: false,
								static: false,
								deprecated: false
							};
						})
					};
				}
			}
		}

		return fieldsAndMethods;
	}

	private _getManifestModels(document: TextDocument) {
		let models: { type: string; name: string }[] = [];
		const fileName = document.fileName;
		const currentClassName = fileName && this.parser.fileReader.getClassNameFromPath(fileName);
		if (currentClassName) {
			const manifest = ParserPool.getManifestForClass(currentClassName);
			if (manifest && manifest.content["sap.ui5"]?.models) {
				models = Object.keys(manifest.content["sap.ui5"]?.models).map(key => ({
					type: manifest.content["sap.ui5"]?.models[key].type,
					name: key
				}));
			}
		}

		return models;
	}

	private _getCurrentClassModels(currentClassName: string) {
		let models: { type: string; name: string }[] = [];
		if (currentClassName) {
			const UIClass = this.parser.classFactory.getUIClass(currentClassName);
			if (UIClass instanceof CustomJSClass) {
				const callExpressions = UIClass.methods.reduce((accumulator: any[], UIMethod) => {
					if (UIMethod.node) {
						const callExpressions = this.syntaxAnalyser
							.expandAllContent(UIMethod.node)
							.filter((node: any) => node.type === "CallExpression");
						accumulator.push(...callExpressions);
					}
					return accumulator;
				}, []);

				const setModelCallExpressions = callExpressions.filter(
					(callExpression: any) =>
						callExpression.callee?.property?.name === "setModel" &&
						callExpression.arguments &&
						callExpression.arguments[1]?.value
				);
				models = setModelCallExpressions.map((callExpression: any) => {
					const modelName = callExpression.arguments[1].value;
					const modelClassName = this.syntaxAnalyser.getClassNameFromSingleAcornNode(
						callExpression.arguments[0],
						UIClass
					);

					return {
						type: modelClassName,
						name: modelName
					};
				});
			}
		}

		return models;
	}

	private _generateFieldsFromArgument(argument: any, position: number) {
		let fields: string[] = [];

		if (position && argument.type === "ObjectExpression" && argument.properties) {
			const property = this.syntaxAnalyser.findAcornNode(argument.properties, position);
			if (property) {
				fields.push(property.key.name);

				if (property && property.value?.type === "ObjectExpression") {
					fields = fields.concat(this._generateFieldsFromArgument(property.value, position));
				}
			}
		}

		return fields;
	}

	private _getObjectFromObject(object: any, fields: string[]): any {
		let objectToReturn;

		const field = fields.shift();
		if (field) {
			objectToReturn = object[field];

			objectToReturn = this._getObjectFromObject(objectToReturn, fields);
		} else {
			objectToReturn = object;
		}

		return objectToReturn;
	}

	private _generatePropertyFieldsFor(
		className: string,
		fieldsAndMethods: IFieldsAndMethods = {
			className: "generic",
			fields: [],
			methods: []
		}
	) {
		const UIClass = this.parser.classFactory.getUIClass(className);
		fieldsAndMethods.fields = fieldsAndMethods.fields.concat(
			UIClass.properties.map(property => ({
				name: property.name,
				type: property.type,
				description: property.description,
				visibility: property.visibility,
				owner: "",
				abstract: false,
				static: false,
				deprecated: false
			}))
		);

		if (UIClass.parentClassNameDotNotation) {
			this._generatePropertyFieldsFor(UIClass.parentClassNameDotNotation, fieldsAndMethods);
		}

		return fieldsAndMethods;
	}

	getStackOfNodesForInnerParamsForPosition(className: string, position: number, checkForLastPosition = false) {
		const stack: any[] = [];
		const UIClass = this.parser.classFactory.getUIClass(className);

		if (UIClass instanceof CustomJSClass) {
			const methodNode = UIClass.acornMethodsAndFields.find((node: any) => {
				return node.start < position && node.end >= position;
			})?.value;

			if (methodNode) {
				const methodBody = methodNode.body;
				const content = methodBody && this.syntaxAnalyser.expandAllContent(methodBody);
				const nodeWithCurrentPosition =
					content &&
					this.syntaxAnalyser.findAcornNode(
						content.filter((node: any) => node.type === "CallExpression").reverse(),
						position
					);

				if (nodeWithCurrentPosition) {
					this._generateStackOfNodesForInnerPosition(
						nodeWithCurrentPosition,
						position,
						stack,
						checkForLastPosition
					);
				}
			}
		}

		return stack;
	}

	private _generateStackOfNodesForInnerPosition(
		node: any,
		position: number,
		stack: any[],
		checkForLastPosition = false
	) {
		const nodeTypesToUnshift = [
			"CallExpression",
			"MemberExpression",
			"ThisExpression",
			"NewExpression",
			"Identifier"
		];
		const positionIsCorrect =
			node.start < position && (checkForLastPosition ? node.end >= position : node.end > position);
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
			this._generateStackOfNodesForInnerPosition(innerNode, position, stack, checkForLastPosition);
		}
	}
}
