import { IParserConfigHandler } from "./classes/config/IParserConfigHandler";
import { PackageParserConfigHandler } from "./classes/config/PackageParserConfigHandler";
import { IUIClassFactory } from "./classes/parsing/factory/IUIClassFactory";
import { AcornSyntaxAnalyzer } from "./classes/parsing/jsparser/AcornSyntaxAnalyzer";
import { ISyntaxAnalyser } from "./classes/parsing/jsparser/ISyntaxAnalyser";
import { IFileReader } from "./classes/parsing/util/filereader/IFileReader";
import { TextDocument } from "./classes/parsing/util/textdocument/TextDocument";
import { WorkspaceFolder } from "./classes/parsing/util/textdocument/WorkspaceFolder";
import { XMLParser } from "./classes/parsing/util/xml/XMLParser";
import { AbstractUI5Parser } from "./parser/abstraction/AbstractUI5Parser";
import { UI5JSParser } from "./parser/UI5JSParser";
import { UI5TSParser } from "./parser/UI5TSParser";
import { AnyCustomTSClass, ICustomTSField, ICustomTSMethod } from "./Types";

export {
	UI5JSParser,
	UI5TSParser,
	IParserConfigHandler,
	IUIClassFactory,
	IFileReader,
	ISyntaxAnalyser,
	AcornSyntaxAnalyzer,
	PackageParserConfigHandler,
	AbstractUI5Parser,
	XMLParser,
	TextDocument,
	WorkspaceFolder,
	ICustomTSField,
	ICustomTSMethod,
	AnyCustomTSClass
};
