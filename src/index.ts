import { AbstractUI5Parser } from "./AbstractUI5Parser";
import { IParserConfigHandler } from "./classes/config/IParserConfigHandler";
import { PackageParserConfigHandler } from "./classes/config/PackageParserConfigHandler";
import { TextDocument } from "./classes/UI5Classes/abstraction/TextDocument";
import { WorkspaceFolder } from "./classes/UI5Classes/abstraction/WorkspaceFolder";
import { IUIClassFactory } from "./classes/UI5Classes/interfaces/IUIClassFactory";
import { AcornSyntaxAnalyzer } from "./classes/UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { ISyntaxAnalyser } from "./classes/UI5Classes/JSParser/ISyntaxAnalyser";
import { IFileReader } from "./classes/utils/IFileReader";
import { XMLParser } from "./classes/utils/XMLParser";
import { AnyCustomTSClass, ICustomTSField, ICustomTSMethod } from "./Types";
import { UI5JSParser } from "./UI5JSParser";
import { UI5TSParser } from "./UI5TSParser";

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

