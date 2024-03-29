import { IUI5Parser } from "../../../parser/abstraction/IUI5Parser";
import ParserPool from "../../../parser/pool/ParserPool";
import { MainLooper } from "../jsparser/MainLooper";
import {
	AbstractBaseClass,
	ITypeValue,
	IUIAggregation,
	IUIAssociation,
	IUIEvent,
	IUIField,
	IUIMethod,
	IUIMethodParam,
	IUIProperty
} from "./AbstractBaseClass";

const aXmlnsData = [
	{
		tag: "xmlns",
		value: "sap.m"
	},
	{
		tag: "xmlns:f",
		value: "sap.f"
	},
	{
		tag: "xmlns:c",
		value: "sap.ui.core"
	},
	{
		tag: "xmlns:l",
		value: "sap.ui.layout"
	},
	{
		tag: "xmlns:tnt",
		value: "sap.tnt"
	},
	{
		tag: "xmlns:table",
		value: "sap.ui.table"
	},
	{
		tag: "xmlns:unified",
		value: "sap.ui.unified"
	},
	{
		tag: "xmlns:viz",
		value: "sap.viz"
	},
	{
		tag: "xmlns:chart",
		value: "sap.chart"
	},
	{
		tag: "xmlns:gantt",
		value: "sap.gantt"
	},
	{
		tag: "xmlns:ovp",
		value: "sap.ovp"
	},
	{
		tag: "xmlns:mc",
		value: "sap.suite.ui.microchart"
	},
	{
		tag: "xmlns:commons",
		value: "sap.ui.commons"
	},
	{
		tag: "xmlns:comp",
		value: "sap.ui.comp"
	},
	{
		tag: "xmlns:uxap",
		value: "sap.uxap"
	}
];

const aFioriElementsControllers = [
	"sap.suite.ui.generic.template.ObjectPage.view.Details",
	"sap.suite.ui.generic.template.ListReport.view.ListReport"
];

export class StandardUIClass extends AbstractBaseClass {
	methods: IStandardClassUIMethod[] = [];

	constructor(className: string, parser: IUI5Parser) {
		super(className, parser);

		if (aFioriElementsControllers.includes(className)) {
			this.classExists = true;

			this._addFieldsAndMethodsForFioriElements(className);
		} else {
			this.classExists = !!this._findSAPNode(this.className) || className.endsWith(".library");

			if (this.classExists) {
				this._fillParentClassName();
				this._fillMethods();
				this._fillProperties();
				this._fillFields();
				this._fillEvents();
				this._fillAggregations();
				this._fullAssociations();
				this._fillConstructor();
				this._fillInterfaces();
				this._fillDeprecated();
				this._fillDescription();

				this._enrichWithXmlnsProperties();
			} else if (className === "sap.ui.core.FragmentDefinition") {
				this._enrichWithXmlnsProperties();
			}
		}
	}

	private _fillDescription() {
		const node = this.parser.nodeDAO.findNode(this.className);
		const nodeDescription = node?.getMetadata()?.getRawMetadata()?.description ?? "";
		this.description = StandardUIClass.adjustLinks(this.parser, nodeDescription);
	}

	private _fillDeprecated() {
		const SAPNode = this._findSAPNode(this.className);
		this.deprecated = SAPNode?.getIsDeprecated() || false;
	}

	private _addFieldsAndMethodsForFioriElements(className: string) {
		const proxyFioriElementsClass: any = {
			"sap.suite.ui.generic.template.ObjectPage.view.Details": {
				methods: "sap.suite.ui.generic.template.ObjectPage.controllerFrameworkExtensions",
				fields: "sap.suite.ui.generic.template.ObjectPage.extensionAPI.ExtensionAPI"
			},
			"sap.suite.ui.generic.template.ListReport.view.ListReport": {
				methods: "sap.suite.ui.generic.template.ListReport.controllerFrameworkExtensions",
				fields: "sap.suite.ui.generic.template.ListReport.extensionAPI.ExtensionAPI"
			}
		};
		const neededClassForMethods = proxyFioriElementsClass[className]?.methods;
		const neededClassForFields = proxyFioriElementsClass[className]?.fields;
		if (neededClassForMethods) {
			const SAPNode = this._findSAPNode(neededClassForMethods);
			if (SAPNode) {
				const methods = SAPNode.getMetadata()?.getRawMetadata()?.methods;
				this.methods =
					methods?.map((method: any) => {
						const standardMethod: IStandardClassUIMethod = {
							name: method.name.replace(`${neededClassForMethods}.`, ""),
							visibility: method.visibility || "public",
							description: method.description
								? StandardUIClass.adjustLinks(this.parser, method.description)
								: StandardUIClass.adjustLinks(this.parser, method.code),
							params:
								method.parameters?.map((param: any) => {
									const parameter: IUIMethodParam = {
										isOptional: param.optional || false,
										name: param.name,
										description: StandardUIClass.adjustLinks(this.parser, param.description),
										type: param.types?.map((type: any) => type.value).join("|") || "any"
									};
									return parameter;
								}) || [],
							returnType:
								method.returnValue?.types?.map((type: any) => type.value).join("|") ||
								method.returnValue?.type ||
								"void",
							isFromParent: false,
							owner: this.className,
							abstract: false,
							static: false,
							deprecated: method.deprecated || method.bIsDeprecated
						};

						return standardMethod;
					}) || [];
			}
		}

		if (neededClassForFields) {
			const SAPNode = this._findSAPNode(neededClassForMethods);
			if (SAPNode) {
				this.fields = [
					{
						name: "extensionAPI",
						description: SAPNode.getMetadata()?.getRawMetadata()?.description
							? StandardUIClass.adjustLinks(
									this.parser,
									SAPNode.getMetadata().getRawMetadata().description
									// eslint-disable-next-line no-mixed-spaces-and-tabs
							  )
							: "Extension API",
						type: neededClassForFields,
						visibility: "public",
						owner: this.className,
						abstract: false,
						static: false,
						deprecated: false
					}
				];
			}
		}
	}

	private _enrichWithXmlnsProperties() {
		if (this.className === "sap.ui.core.mvc.View" || this.className === "sap.ui.core.FragmentDefinition") {
			aXmlnsData.forEach(xmlnsData => {
				this.properties.push({
					name: xmlnsData.tag,
					description: xmlnsData.value,
					type: "string",
					visibility: "public",
					typeValues: [
						{
							text: xmlnsData.value,
							description: xmlnsData.value
						}
					]
				});
			});
		}
	}

	private _fillMethods() {
		this.methods = this._getStandardClassMethods(this.className, true);
	}

	private _getStandardClassMethods(className: string, isParent: boolean) {
		let classMethods: IStandardClassUIMethod[] = [];
		const SAPNode = this._findSAPNode(className);
		classMethods =
			SAPNode?.getMethods().map((method: any) => {
				let methodName = method.name.replace(`${this.className}.`, "");
				if (methodName.indexOf(SAPNode.getMetadata()?.getRawMetadata()?.name) > -1) {
					methodName = methodName.replace(SAPNode.getMetadata().getRawMetadata().name + ".", "");
				}

				const classMethod: IStandardClassUIMethod = {
					name: methodName,
					description: `${StandardUIClass.adjustLinks(this.parser, method.description)}`,
					params: method.parameters
						? method.parameters
								.filter((parameter: any) => !parameter.depth)
								.map((parameter: any) => {
									return {
										name: parameter.name + (parameter.optional ? "?" : ""),
										description: StandardUIClass.adjustLinks(this.parser, parameter.description),
										type: parameter.types
											? parameter.types.map((type: any) => type.value).join("|")
											: "any",
										isOptional: parameter.optional || false
									};
								})
						: [],
					returnType: method.returnValue ? method.returnValue.type : "void",
					isFromParent: !isParent,
					api: this.parser.urlBuilder.getMarkupUrlForMethodApi(SAPNode, method.name),
					visibility: method.visibility,
					owner: this.className,
					abstract: false,
					static: false,
					deprecated: method.deprecated || method.bIsDeprecated
				};

				this._removeFirstArgumentIfItIsEvent(classMethod);
				this._addParametersForDataMethod(classMethod);
				return classMethod;
			}) || [];
		return classMethods;
	}

	private _removeFirstArgumentIfItIsEvent(method: IStandardClassUIMethod) {
		if (method.name.startsWith("attach")) {
			if (method.params?.length > 0) {
				const param = method.params.find(param => param.name === "oData?");
				if (param) {
					method.params.splice(method.params.indexOf(param), 1);
				}
			}
		}
	}

	private _addParametersForDataMethod(method: IStandardClassUIMethod) {
		if (method.name === "data" && method.params.length === 0) {
			method.params.push({
				type: "string",
				name: "sCustomDataKey?",
				description: "Unique custom data key",
				isOptional: true
			});
			method.params.push({
				type: "any",
				name: "vData?",
				description: "data for Custom Data",
				isOptional: true
			});
			method.params.push({
				type: "boolean",
				name: "bWriteToDom?",
				description: "Custom data key",
				isOptional: true
			});
		}
	}

	private _findSAPNode(className: string) {
		return this.parser.nodeDAO.findNode(className);
	}

	static adjustLinks(parser: IUI5Parser, text = "") {
		const matches = text.match(/<a target="_self"( .*?)? href=".*?"/g);

		matches?.forEach(match => {
			const hrefIndex = match.indexOf('href="') + 'href="'.length;
			const urlBase = parser.urlBuilder.getUrlBase();
			const newHref = `${urlBase}/#/` + match.substring(hrefIndex, match.length);
			const replaceTo = match.substring(0, hrefIndex) + newHref;
			text = text.replace(match, replaceTo);
		});
		return text;
	}

	static removeTags(text = "") {
		let textWithoutTags = "";
		let i = 0;

		let tagOpened = 0;
		let tagClosed = 0;

		while (i < text.length) {
			if (text[i] === "<") {
				tagOpened++;
			} else if (text[i] === ">") {
				textWithoutTags += " ";
				tagClosed++;
			} else if (tagOpened === tagClosed) {
				textWithoutTags += text[i];
			}

			i++;
		}

		textWithoutTags = textWithoutTags.trim();

		return textWithoutTags;
	}

	private _fillParentClassName() {
		const SAPNode = this._findSAPNode(this.className);
		if (SAPNode) {
			const metadata = SAPNode.getMetadata()?.getRawMetadata();
			if (metadata) {
				this.parentClassNameDotNotation = metadata.extends;
				this.abstract = !!metadata.abstract;
			}
		}
	}

	private _fillFields() {
		const SAPNode = this._findSAPNode(this.className);
		this.fields =
			SAPNode?.getFields().reduce(
				(accumulator: IUIField[], { name, type, description, visibility, deprecated }: any) => {
					const additionalDescription = this._generateAdditionalDescriptionFrom(type);
					accumulator.push({
						name: name,
						type: type,
						description: `${additionalDescription}\n${StandardUIClass.adjustLinks(
							this.parser,
							description
						)}`.trim(),
						visibility: visibility,
						owner: this.className,
						abstract: false,
						static: false,
						deprecated: deprecated
					});
					return accumulator;
				},
				[]
			) || [];
	}

	private _fillProperties() {
		this.properties = this._getStandardClassProperties(this.className);
	}

	private _getStandardClassProperties(className: string) {
		let classProperties: IUIProperty[] = [];
		const SAPNode = this._findSAPNode(className);
		classProperties =
			SAPNode?.getProperties().reduce(
				(accumulator: IUIProperty[], { defaultValue, name, type, description, visibility }: any) => {
					const additionalDescription = this._generateAdditionalDescriptionFrom(type);
					accumulator.push({
						name,
						defaultValue: defaultValue.toString(),
						type,
						typeValues: this.generateTypeValues(type),
						description: `${additionalDescription}\n${StandardUIClass.adjustLinks(
							this.parser,
							description
						)}`.trim(),
						visibility
					});
					return accumulator;
				},
				[]
			) || [];

		const specialSettings: IUIProperty[] =
			SAPNode?.getSpecialSettings().map(({ name, type, description, visibility }: any) => {
				const additionalDescription = this._generateAdditionalDescriptionFrom(type);
				return {
					name,
					defaultValue: "",
					type,
					typeValues: this.generateTypeValues(type),
					description: `${additionalDescription}\n${StandardUIClass.adjustLinks(
						this.parser,
						description
					)}`.trim(),
					visibility
				};
			}) || [];

		classProperties.push(...specialSettings);

		return classProperties;
	}

	private _generateAdditionalDescriptionFrom(className: string) {
		let additionalDescription = "";
		const isThisClassFromAProject = !!ParserPool.getManifestForClass(className);
		if (!isThisClassFromAProject) {
			const SAPNode = this._findSAPNode(className);
			additionalDescription =
				SAPNode?.getProperties().reduce((accumulator: string, property: any) => {
					accumulator += `${property.name}\n`;

					return accumulator;
				}, "") || "";
		}

		return additionalDescription;
	}

	protected generateTypeValues(type: string) {
		let typeValues = super.generateTypeValues(type);

		const isThisClassFromAProject = !!ParserPool.getManifestForClass(type);
		if (typeValues.length === 0 && !isThisClassFromAProject) {
			const typeNode = this._findSAPNode(type);
			const metadata = typeNode?.getMetadata();
			typeValues =
				metadata?.rawMetadata?.properties?.map((property: any): ITypeValue => {
					return {
						text: `${property.name}`.replace(`${type}.`, ""),
						description: StandardUIClass.adjustLinks(this.parser, property.description)
					};
				}) || [];
		}

		return typeValues;
	}

	private _fillEvents() {
		this.events = this._getStandardClassEvents(this.className);
	}

	private _getStandardClassEvents(className: string) {
		let classEvents: IUIEvent[] = [];
		const SAPNode = this._findSAPNode(className);
		classEvents =
			SAPNode?.getEvents().reduce((accumulator: IUIEvent[], event: any) => {
				accumulator.push({
					name: event.name,
					description: StandardUIClass.adjustLinks(this.parser, event.description),
					visibility: event.visibility,
					params: event?.parameters
						?.filter((parameter: any) => parameter.depth === 2)
						.map((parameter: any) => {
							return {
								name: parameter.name,
								type: parameter.type
							};
						})
				});
				return accumulator;
			}, []) || [];

		return classEvents;
	}

	private _fillAggregations() {
		this.aggregations = this._getStandardClassAggregations(this.className);
	}

	private _getStandardClassAggregations(className: string) {
		let classAggregations: IUIAggregation[] = [];
		const SAPNode = this._findSAPNode(className);

		classAggregations =
			SAPNode?.getAggregations().reduce((accumulator: IUIAggregation[], aggregation: any) => {
				accumulator.push({
					name: aggregation.name,
					type: aggregation.type,
					multiple: aggregation.cardinality === "0..n",
					singularName: aggregation.singularName,
					description: StandardUIClass.adjustLinks(this.parser, aggregation.description),
					visibility: aggregation.visibility,
					default: SAPNode.getMetadata()?.getUI5Metadata()?.defaultAggregation === aggregation.name
				});
				return accumulator;
			}, []) || [];

		return classAggregations;
	}

	private _fullAssociations() {
		this.associations = this._getStandardClassAssociations(this.className);
	}

	private _getStandardClassAssociations(className: string) {
		let classAssociation: IUIAssociation[] = [];
		const SAPNode = this._findSAPNode(className);

		classAssociation =
			SAPNode?.getAssociations().reduce((accumulator: IUIAssociation[], association: any) => {
				accumulator.push({
					name: association.name,
					type: association.type,
					description: StandardUIClass.adjustLinks(this.parser, association.description),
					multiple: association.multiple || association.cardinality === "0..n",
					singularName: association.singularName,
					visibility: association.visibility
				});
				return accumulator;
			}, []) || [];
		return classAssociation;
	}

	private _fillConstructor() {
		const SAPNode = this._findSAPNode(this.className);
		const metadata = SAPNode?.getMetadata();
		if (metadata?.rawMetadata?.constructor?.codeExample) {
			const constructor = metadata.rawMetadata.constructor;
			let parameters: IUIMethodParam[] = [];
			if (!constructor.parameters) {
				const codeExample = StandardUIClass.adjustLinks(this.parser, constructor.codeExample);
				let parameterText = MainLooper.getEndOfChar("(", ")", codeExample);
				parameterText = parameterText.substring(1, parameterText.length - 1); //remove ()
				parameters = parameterText
					? parameterText.split(", ").map(param => {
							return {
								name: param,
								description: "",
								type: "any",
								isOptional: param.endsWith("?")
							};
							// eslint-disable-next-line no-mixed-spaces-and-tabs
					  })
					: [];
			} else {
				parameters = constructor.parameters
					.filter((param: any) => param.depth === 0)
					.map((param: any) => {
						return {
							name: param.name + (param.optional ? "?" : ""),
							description: StandardUIClass.adjustLinks(param.description),
							type: param.types.map((type: any) => type.name).join("|"),
							isOptional: param.optional
						};
					});
			}

			this.methods.push({
				name: "constructor",
				description: StandardUIClass.adjustLinks(
					this.parser,
					constructor.description ?? constructor.codeExample
				),
				params: parameters,
				returnType: this.className,
				isFromParent: false,
				api: this.parser.urlBuilder.getUrlForClassApi(this),
				visibility: "public",
				owner: this.className,
				abstract: false,
				static: false,
				deprecated: false
			});
		}
	}

	private _fillInterfaces() {
		const SAPNode = this._findSAPNode(this.className);
		const metadata = SAPNode?.getMetadata();
		if (metadata?.getRawMetadata()?.implements) {
			this.interfaces = metadata?.getRawMetadata()?.implements;
		}
	}
}

interface IStandardClassUIMethod extends IUIMethod {
	isFromParent: boolean;
}
