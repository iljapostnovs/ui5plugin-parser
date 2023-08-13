import * as commentParser from "comment-parser";
import * as fastXmlParser from "fast-xml-parser";
import { AnyCustomTSClass, ICustomTSField, ICustomTSMethod } from "./Types";
import { IParserConfigHandler } from "./classes/config/IParserConfigHandler";
import { PackageParserConfigHandler } from "./classes/config/PackageParserConfigHandler";
import { AcornSyntaxAnalyzer } from "./classes/parsing/jsparser/AcornSyntaxAnalyzer";
import { ISyntaxAnalyser } from "./classes/parsing/jsparser/ISyntaxAnalyser";
import { IClassFactory } from "./classes/parsing/ui5class/factory/IClassFactory";
import { toNative } from "./classes/parsing/util/filereader/AbstractFileReader";
import { IFileReader } from "./classes/parsing/util/filereader/IFileReader";
import { ReferenceFinder } from "./classes/parsing/util/referencefinder/ReferenceFinder";
import { TSReferenceFinder } from "./classes/parsing/util/referencefinder/TSReferenceFinder";
import { TextDocument } from "./classes/parsing/util/textdocument/TextDocument";
import { WorkspaceFolder } from "./classes/parsing/util/textdocument/WorkspaceFolder";
import { XMLParser } from "./classes/parsing/util/xml/XMLParser";
import { UI5JSParser } from "./parser/UI5JSParser";
import { UI5TSParser } from "./parser/UI5TSParser";
import { AbstractUI5Parser } from "./parser/abstraction/AbstractUI5Parser";
import ParserFactory from "./parser/factory/ParserFactory";
import ParserPool from "./parser/pool/ParserPool";
import lineColumn = require("line-column");

export {
	AbstractUI5Parser,
	AcornSyntaxAnalyzer,
	AnyCustomTSClass,
	IClassFactory,
	ICustomTSField,
	ICustomTSMethod,
	IFileReader,
	IParserConfigHandler,
	ISyntaxAnalyser,
	PackageParserConfigHandler,
	ParserFactory,
	ParserPool,
	ReferenceFinder,
	TSReferenceFinder,
	TextDocument,
	UI5JSParser,
	UI5TSParser,
	WorkspaceFolder,
	XMLParser,
	commentParser,
	fastXmlParser,
	lineColumn,
	toNative
};
