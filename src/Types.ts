import {
	ICustomClassTSField,
	ICustomClassTSMethod,
	CustomTSClass
} from "./classes/UI5Classes/UI5Parser/UIClass/CustomTSClass";
import {
	ICustomClassTSObjectField,
	ICustomClassTSObjectMethod,
	CustomTSObject
} from "./classes/UI5Classes/UI5Parser/UIClass/CustomTSObject";

export type ICustomTSField = ICustomClassTSField | ICustomClassTSObjectField;
export type ICustomTSMethod = ICustomClassTSMethod | ICustomClassTSObjectMethod;
export type AnyCustomTSClass = CustomTSClass | CustomTSObject;
