import { IParserConfigHandler } from "./classes/config/IParserConfigHandler";
import { IUIClassFactory } from "./classes/UI5Classes/interfaces/IUIClassFactory";
import { ISyntaxAnalyser } from "./classes/UI5Classes/JSParser/ISyntaxAnalyser";
import { UI5Parser } from "./UI5Parser";
import { AcornSyntaxAnalyzer } from "./classes/UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { PackageParserConfigHandler } from "./classes/config/PackageParserConfigHandler";
import { XMLParser } from "./classes/utils/XMLParser";
import { TextDocument } from "./classes/UI5Classes/abstraction/TextDocument";
import { WorkspaceFolder } from "./classes/UI5Classes/abstraction/WorkspaceFolder";
import { IFileReader } from "./classes/utils/IFileReader";
import { UI5TSParser } from "./UI5TSParser";

export {
	UI5Parser,
	UI5TSParser,
	IParserConfigHandler,
	IUIClassFactory,
	IFileReader,
	ISyntaxAnalyser,
	AcornSyntaxAnalyzer,
	PackageParserConfigHandler,
	XMLParser,
	TextDocument,
	WorkspaceFolder
};