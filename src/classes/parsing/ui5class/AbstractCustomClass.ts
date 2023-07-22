import { ICacheable } from "../abstraction/ICacheable";
import { IViewsAndFragments } from "../ui5class/factory/IClassFactory";
import {
	AbstractBaseClass,
	IMember,
	IUIAggregation,
	IUIAssociation,
	IUIEvent,
	IUIField,
	IUIMethod,
	IUIProperty
} from "./AbstractBaseClass";

export interface IUIDefine<NodeType = any> extends INodeBearer<NodeType> {
	path: string;
	className: string;
	classNameDotNotation: string;
	start: number;
	end: number;
}

export interface INodeBearer<NodeType> {
	node?: NodeType;
}

export interface ICustomMember<NodeType = any>
	extends IMember,
		INodeBearer<NodeType>,
		IXMLDocumentMentionable,
		IMemberLocation,
		UI5Ignoreable {}

export interface IXMLDocumentMentionable {
	mentionedInTheXMLDocument: boolean;
}
export interface UI5Ignoreable {
	ui5ignored: boolean;
}
export interface IMemberLocation {
	loc?: {
		start: {
			line: number;
			column: number;
		};
		end: {
			line: number;
			column: number;
		};
	};
}
export interface ICustomClassMethod<NodeType = any>
	extends IUIMethod,
		INodeBearer<NodeType>,
		IMemberLocation,
		IXMLDocumentMentionable,
		UI5Ignoreable {
	position?: number;
	isEventHandler: boolean;
}
export interface ICustomClassField<NodeType = any>
	extends IUIField,
		INodeBearer<NodeType>,
		IXMLDocumentMentionable,
		IMemberLocation,
		UI5Ignoreable {}

export interface IViewsAndFragmentsCache extends IViewsAndFragments {
	flags: {
		removeDuplicates: boolean;
		includeChildren: boolean;
		includeMentioned: boolean;
		includeParents: boolean;
	};
}
export abstract class AbstractCustomClass<
		MethodNodeType = any,
		FieldNodeType = any,
		ClassNodeType = any,
		MetadataObjectType = any
	>
	extends AbstractBaseClass
	implements ICacheable, INodeBearer<ClassNodeType>
{
	abstract methods: ICustomClassMethod<MethodNodeType>[];
	abstract fields: ICustomClassField<FieldNodeType>[];
	abstract classText: string;
	abstract node: ClassNodeType;
	abstract UIDefine: IUIDefine[];
	abstract parentClassNameDotNotation: string;
	abstract defaultModelClassName?: string;
	abstract fsPath: string;
	relatedViewsAndFragments?: IViewsAndFragmentsCache[];
	private _cache: Record<string, any> = {};
	setCache<Type>(cacheName: string, cacheValue: Type) {
		this._cache[cacheName] = cacheValue;
	}

	getCache<Type>(cacheName: string): Type {
		return <Type>this._cache[cacheName];
	}

	resetCache() {
		this._cache = {};
	}

	protected _fillUI5Metadata(metadataObject: MetadataObjectType): void {
		this.fields = this._fillFields(metadataObject);
		this.methods = this._fillMethods(metadataObject);
		this.aggregations = this._fillAggregations(metadataObject);
		this.events = this._fillEvents(metadataObject);
		this.properties = this._fillProperties(metadataObject);
		this.associations = this._fillAssociations(metadataObject);
		this.interfaces = this._fillInterfaces(metadataObject);
	}

	protected abstract _fillMethods(metadata: MetadataObjectType): ICustomClassMethod<MethodNodeType>[];

	protected abstract _fillFields(metadata: MetadataObjectType): ICustomClassField<FieldNodeType>[];

	protected abstract _fillIsAbstract(): void;

	protected abstract _getUIDefine(): IUIDefine[];

	protected abstract _fillParentClassName(): void;

	protected abstract _fillInterfaces(metadata: MetadataObjectType): string[];

	protected abstract _fillAggregations(metadata: MetadataObjectType): IUIAggregation[];

	protected abstract _fillEvents(metadata: MetadataObjectType): IUIEvent[];

	protected abstract _fillProperties(metadata: MetadataObjectType): IUIProperty[];

	protected abstract _fillAssociations(metadata: MetadataObjectType): IUIAssociation[];
}
