import { IUI5Parser } from "../../../../parser/abstraction/IUI5Parser";
import { AbstractCustomClass } from "../../ui5class/AbstractCustomClass";
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
	getUIClass(className: string): AbstractBaseClass;
	getAllCustomUIClasses(): AbstractCustomClass[];
	getAllExistentUIClasses(): IUIClassMap;
	getDefaultModelForClass(className: string): string | undefined;
	isMethodOverriden(className: string, methodName: string): boolean;
	removeClass(className: string): void;
	getParent(UIClass: AbstractBaseClass): AbstractBaseClass | undefined;
	isCustomClass(UIClass: AbstractBaseClass): UIClass is CustomClass;
	setNewNameForClass(oldPath: string, newPath: string): void;
	getViewsAndFragmentsOfControlHierarchically(
		CurrentUIClass: CustomClass,
		checkedClasses?: string[],
		removeDuplicates?: boolean,
		includeChildren?: boolean,
		includeMentioned?: boolean,
		includeParents?: boolean
	): IViewsAndFragments;

	setParser(parser: IUI5Parser): void;
}

export interface IUIClassMap {
	[key: string]: AbstractBaseClass;
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
