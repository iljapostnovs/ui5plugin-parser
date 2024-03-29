import { IUI5Parser } from "../../../parser/abstraction/IUI5Parser";

export interface IDescriptionable {
	description: string;
}

export interface IUIMethodParam extends IDescriptionable, IName {
	isOptional: boolean;
	type: string;
}

export interface IName {
	readonly name: string;
}

export interface IAbstract {
	abstract: boolean;
}

export interface IStatic {
	static: boolean;
}

export interface IMember extends IName, IAbstract, IStatic, IVisibility, IDescriptionable {
	owner: string;
	deprecated: boolean;
}

export interface IVisibility {
	visibility: string;
}
export interface IUIMethod extends IMember {
	readonly params: IUIMethodParam[];
	returnType: string;
	api?: string;
}
export interface IUIField extends IMember {
	type: string | undefined;
}
export interface ITypeValue extends IDescriptionable {
	text: string;
}
export interface IUIProperty extends IName, IVisibility, IDescriptionable {
	type: string | undefined;
	typeValues: ITypeValue[];
	defaultValue?: string;
}
export interface IUIAggregation extends IName, IVisibility, IDescriptionable {
	type: string;
	multiple: boolean;
	singularName: string;
	default: boolean;
}
export interface IUIEventParam extends IName {
	type: string;
}
export interface IUIEvent extends IName, IVisibility, IDescriptionable {
	params: IUIEventParam[];
}
export interface IUIAssociation extends IName, IVisibility, IDescriptionable {
	type: string | undefined;
	multiple: boolean;
	singularName: string;
}
export abstract class AbstractBaseClass implements IAbstract, IDescriptionable, IAbstract {
	classExists: boolean;
	abstract: boolean;
	className: string;
	methods: IUIMethod[] = [];
	fields: IUIField[] = [];
	properties: IUIProperty[] = [];
	aggregations: IUIAggregation[] = [];
	events: IUIEvent[] = [];
	associations: IUIAssociation[] = [];
	interfaces: string[] = [];
	parentClassNameDotNotation = "";
	deprecated = false;
	description = "";
	protected readonly parser: IUI5Parser;

	constructor(className: string, parser: IUI5Parser) {
		this.className = className;
		this.classExists = true;
		this.abstract = false;
		this.parser = parser;
	}

	getMembers(): IMember[] {
		return [...this.methods, ...this.fields];
	}

	protected generateTypeValues(type: string) {
		let typeValues: ITypeValue[] = [];

		if (type === "boolean") {
			typeValues = [
				{ text: "true", description: "boolean true" },
				{ text: "false", description: "boolean false" }
			];
		} else if (type === "sap.ui.core.URI") {
			typeValues = this.parser.icons.icons.map(icon => ({ text: icon, description: icon }));
		} else if (type === "string") {
			// const currentComponentName = UI5Plugin.getInstance().fileReader.getComponentNameOfAppInCurrentWorkspaceFolder();
			// if (currentComponentName) {
			// 	typeValues = ResourceModelData.resourceModels[currentComponentName];
			// }
		}

		return typeValues;
	}
}
