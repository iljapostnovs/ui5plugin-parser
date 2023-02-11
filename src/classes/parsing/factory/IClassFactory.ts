import { AbstractCustomClass } from "../ui5class/AbstractCustomClass";
import {
	AbstractJSClass,
	IUIAggregation,
	IUIAssociation,
	IUIEvent,
	IUIField,
	IUIMethod,
	IUIProperty
} from "../ui5class/js/AbstractJSClass";
import { IFragment, IView } from "../util/filereader/FileReader";
import { TextDocument } from "../util/textdocument/TextDocument";

export interface IClassFactory<CustomClass extends AbstractCustomClass> {
	isClassAChildOfClassB(classA: string, classB: string): boolean;
	setNewContentForClassUsingDocument(document: TextDocument, force?: boolean): void;
	setNewCodeForClass(classNameDotNotation: string, classFileText: string, force?: boolean): void;
	enrichTypesInCustomClass(UIClass: CustomClass): void;
	getFieldsAndMethodsForClass(className: string, returnDuplicates?: boolean): IFieldsAndMethods;
	getClassFields(className: string, returnDuplicates?: boolean): IUIField[];
	getClassMethods(className: string, returnDuplicates?: boolean, methods?: IUIMethod[]): IUIMethod[];
	getClassEvents(className: string, returnDuplicates?: boolean): IUIEvent[];
	getClassAggregations(className: string, returnDuplicates?: boolean): IUIAggregation[];
	getClassAssociations(className: string, returnDuplicates?: boolean): IUIAssociation[];
	getClassProperties(className: string, returnDuplicates?: boolean): IUIProperty[];
	getUIClass(className: string): AbstractJSClass;
	getAllCustomUIClasses(): CustomClass[];
	getAllExistentUIClasses(): IUIClassMap;
	getDefaultModelForClass(className: string): string | undefined;
	isMethodOverriden(className: string, methodName: string): boolean;
	removeClass(className: string): void;
	getParent(UIClass: AbstractJSClass): AbstractJSClass | undefined;
	isCustomClass(UIClass: AbstractJSClass): UIClass is CustomClass;
	setNewNameForClass(oldPath: string, newPath: string): void;
	getViewsAndFragmentsOfControlHierarchically(
		CurrentUIClass: CustomClass,
		checkedClasses?: string[],
		removeDuplicates?: boolean,
		includeChildren?: boolean,
		includeMentioned?: boolean,
		includeParents?: boolean
	): IViewsAndFragments;
}

export interface IUIClassMap {
	[key: string]: AbstractJSClass;
}
export interface IFieldsAndMethods {
	className: string;
	fields: IUIField[];
	methods: IUIMethod[];
}

export interface IViewsAndFragments {
	views: IView[];
	fragments: IFragment[];
}
