import { IParserConfigHandler } from "./classes/config/IConfigHandler";
import { IUIClassFactory } from "./classes/UI5Classes/interfaces/IUIClassFactory";
import { ISyntaxAnalyser } from "./classes/UI5Classes/JSParser/ISyntaxAnalyser";
import { UI5Parser } from "./UI5Parser";
import { FileReader } from "./classes/utils/FileReader";
import { AcornSyntaxAnalyzer } from "./classes/UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { PackageConfigHandler } from "./classes/config/PackageConfigHandler";
import { XMLParser } from "./classes/utils/XMLParser";
import { TextDocument } from "./classes/UI5Classes/abstraction/TextDocument";
import { WorkspaceFolder } from "./classes/UI5Classes/abstraction/WorkspaceFolder";

export {
	UI5Parser,
	IParserConfigHandler,
	IUIClassFactory,
	ISyntaxAnalyser,
	FileReader,
	AcornSyntaxAnalyzer,
	PackageConfigHandler,
	XMLParser,
	TextDocument,
	WorkspaceFolder
};