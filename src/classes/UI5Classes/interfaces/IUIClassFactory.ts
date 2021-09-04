import { IFragment, IView } from "../../utils/FileReader";
import { TextDocument } from "../abstraction/TextDocument";
import { AbstractUIClass, IUIAggregation, IUIAssociation, IUIEvent, IUIField, IUIMethod, IUIProperty } from "../UI5Parser/UIClass/AbstractUIClass";
import { CustomUIClass } from "../UI5Parser/UIClass/CustomUIClass";

export interface IUIClassFactory {
	isClassAChildOfClassB(classA: string, classB: string): boolean;
	setNewContentForClassUsingDocument(document: TextDocument, force?: boolean): void;
	setNewCodeForClass(classNameDotNotation: string, classFileText: string, force?: boolean): void;
	enrichTypesInCustomClass(UIClass: CustomUIClass): void;
	getFieldsAndMethodsForClass(className: string, returnDuplicates: boolean): IFieldsAndMethods;
	getClassFields(className: string, returnDuplicates: boolean): IUIField[];
	getClassMethods(className: string, returnDuplicates: boolean, methods?: IUIMethod[]): IUIMethod[];
	getClassEvents(className: string, returnDuplicates: boolean): IUIEvent[];
	getClassAggregations(className: string, returnDuplicates: boolean): IUIAggregation[];
	getClassAssociations(className: string, returnDuplicates: boolean): IUIAssociation[];
	getClassProperties(className: string, returnDuplicates: boolean): IUIProperty[];
	getUIClass(className: string): AbstractUIClass;
	getAllCustomUIClasses(): CustomUIClass[];
	getAllExistentUIClasses(): IUIClassMap;
	getDefaultModelForClass(className: string): string | undefined;
	isMethodOverriden(className: string, methodName: string): boolean;
	removeClass(className: string): void;
	getParent(UIClass: AbstractUIClass): AbstractUIClass | undefined;
	setNewNameForClass(oldPath: string, newPath: string): void;
	getViewsAndFragmentsOfControlHierarchically(CurrentUIClass: CustomUIClass, checkedClasses?: string[], removeDuplicates?: boolean, includeChildren?: boolean, includeMentioned?: boolean, includeParents?: boolean): IViewsAndFragments
}

export interface IUIClassMap {
	[key: string]: AbstractUIClass;
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