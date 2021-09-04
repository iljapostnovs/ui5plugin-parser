import { TextDocument } from "../abstraction/TextDocument";
import { IFieldsAndMethods } from "../interfaces/IUIClassFactory";
import { IUIMethod, IUIField, IUIEventParam } from "../UI5Parser/UIClass/AbstractUIClass";
import { CustomUIClass } from "../UI5Parser/UIClass/CustomUIClass";

export interface ISyntaxAnalyser {
	getFieldsAndMethodsOfTheCurrentVariable(document: TextDocument, position: number): IFieldsAndMethods | undefined;
	findInnerNode(node: any, position: number): any;
	getResultOfPromise(className: string): string;
	getClassNameOfTheModelFromManifest(modelName: string, className: string, clearStack: boolean): string;
	getParametersOfTheEvent(eventName: string, className: string): IUIEventParam[] | undefined
	getEventHandlerData(node: any, className: string): {
		className: string;
		eventName: string;
	} | undefined;
	findMethodReturnType(method: IUIMethod, className: string, includeParentMethods: boolean, clearStack: boolean): void;
	findFieldType(field: IUIField, className: string, includeParentMethods: boolean, clearStack: boolean): void;
	getContent(node: any): any[];
	getAcornVariableDeclarationAtIndex(UIClass: CustomUIClass, index: number): any;
	getAcornAssignmentExpressionAtIndex(UIClass: CustomUIClass, index: number): any;
	getClassNameFromSingleAcornNode(node: any, UIClass: CustomUIClass, stack?: any[]): string;
	findAcornNode(nodes: any[], position: number): any;
	findClassNameForStack(stack: any[], currentClassName: string, primaryClassName?: string, clearStack?: boolean): string;
	expandAllContent(node: any, content?: any[]): any[];
	getEventHandlerDataFromJSClass(className: string, eventHandlerName: string): { className: string, eventName: string, node: any } | undefined;

}