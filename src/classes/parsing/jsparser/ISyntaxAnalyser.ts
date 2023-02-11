import { IFieldsAndMethods } from "../factory/IClassFactory";
import { IUIEventParam, IUIField, IUIMethod } from "../ui5class/js/AbstractJSClass";
import { CustomJSClass } from "../ui5class/js/CustomJSClass";
import { TextDocument } from "../util/textdocument/TextDocument";

export interface ISyntaxAnalyser {
	getFieldsAndMethodsOfTheCurrentVariable(document: TextDocument, position: number): IFieldsAndMethods | undefined;
	findInnerNode(node: any, position: number): any;
	getResultOfPromise(className: string): string;
	getClassNameOfTheModelFromManifest(modelName: string, className: string, clearStack: boolean): string;
	getParametersOfTheEvent(eventName: string, className: string): IUIEventParam[] | undefined;
	getEventHandlerData(
		node: any,
		className: string
	):
		| {
				className: string;
				eventName: string;
		}
		| undefined;
	findMethodReturnType(
		method: IUIMethod,
		className: string,
		includeParentMethods: boolean,
		clearStack: boolean
	): void;
	findFieldType(field: IUIField, className: string, includeParentMethods: boolean, clearStack: boolean): void;
	getContent(node: any): any[];
	getAcornVariableDeclarationAtIndex(UIClass: CustomJSClass, index: number): any;
	getAcornAssignmentExpressionAtIndex(UIClass: CustomJSClass, index: number): any;
	getClassNameFromSingleAcornNode(node: any, UIClass: CustomJSClass, stack?: any[]): string;
	findAcornNode(nodes: any[], position: number): any;
	findClassNameForStack(
		stack: any[],
		currentClassName: string,
		primaryClassName?: string,
		clearStack?: boolean
	): string;
	expandAllContent(node: any, content?: any[]): any[];
	findMethodHierarchically(className: string, methodName: string): IUIMethod | undefined;
	getEventHandlerDataFromJSClass(
		className: string,
		eventHandlerName: string
	): { className: string; eventName: string; node: any } | undefined;
}
