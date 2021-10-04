import { IParserConfigHandler } from "./classes/config/IParserConfigHandler";
import { IUIClassFactory } from "./classes/UI5Classes/interfaces/IUIClassFactory";
import { ISyntaxAnalyser } from "./classes/UI5Classes/JSParser/ISyntaxAnalyser";
import { UI5Parser } from "./UI5Parser";
import { AcornSyntaxAnalyzer } from "./classes/UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { PackageConfigHandler } from "./classes/config/PackageConfigHandler";
import { XMLParser } from "./classes/utils/XMLParser";
import { TextDocument } from "./classes/UI5Classes/abstraction/TextDocument";
import { WorkspaceFolder } from "./classes/UI5Classes/abstraction/WorkspaceFolder";
import { IFileReader } from "./classes/utils/IFileReader";

export {
	UI5Parser,
	IParserConfigHandler,
	IUIClassFactory,
	IFileReader,
	ISyntaxAnalyser,
	AcornSyntaxAnalyzer,
	PackageConfigHandler,
	XMLParser,
	TextDocument,
	WorkspaceFolder
};