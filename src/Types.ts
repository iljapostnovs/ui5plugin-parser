import { CustomTSClass, ICustomClassTSField, ICustomClassTSMethod } from "./classes/parsing/ui5class/ts/CustomTSClass";
import {
	CustomTSObject,
	ICustomClassTSObjectField,
	ICustomClassTSObjectMethod
} from "./classes/parsing/ui5class/ts/CustomTSObject";

export type ICustomTSField = ICustomClassTSField | ICustomClassTSObjectField;
export type ICustomTSMethod = ICustomClassTSMethod | ICustomClassTSObjectMethod;
export type AnyCustomTSClass = CustomTSClass | CustomTSObject;
