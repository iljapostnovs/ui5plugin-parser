import { IParserConfigHandler } from "../classes/config/IParserConfigHandler";
import { PackageParserConfigHandler } from "../classes/config/PackageParserConfigHandler";
import { HTTPHandler } from "../classes/http/HTTPHandler";
import { URLBuilder } from "../classes/http/URLBuilder";
import { SAPIcons } from "../classes/librarydata/SAPIcons";
import { SAPNodeDAO } from "../classes/librarydata/SAPNodeDAO";
import { UI5MetadataDAO } from "../classes/librarydata/UI5MetadataDAO";
import { IUIClassFactory } from "../classes/parsing/factory/IUIClassFactory";
import { UIClassFactory } from "../classes/parsing/factory/JSClassFactory";
import { AcornSyntaxAnalyzer } from "../classes/parsing/jsparser/AcornSyntaxAnalyzer";
import { ISyntaxAnalyser } from "../classes/parsing/jsparser/ISyntaxAnalyser";
import { CustomUIClass } from "../classes/parsing/ui5class/CustomUIClass";
import { FileReader } from "../classes/parsing/util/filereader/FileReader";
import { IFileReader } from "../classes/parsing/util/filereader/IFileReader";
import { ResourceModelData } from "../classes/parsing/util/i18n/ResourceModelData";
import { TextDocumentTransformer } from "../classes/parsing/util/textdocument/TextDocumentTransformer";
import { XMLParser } from "../classes/parsing/util/xml/XMLParser";
import { ReusableMethods } from "../classes/ReusableMethods";
import { AbstractUI5Parser } from "./abstraction/AbstractUI5Parser";
import { IConstructorParams } from "./abstraction/IUI5Parser";

export class UI5JSParser extends AbstractUI5Parser<CustomUIClass> {
	readonly configHandler: IParserConfigHandler;
	readonly classFactory: IUIClassFactory<CustomUIClass>;
	readonly fileReader: IFileReader;
	readonly syntaxAnalyser: ISyntaxAnalyser;
	readonly nodeDAO: SAPNodeDAO;
	readonly metadataDAO: UI5MetadataDAO;
	readonly urlBuilder: URLBuilder;
	readonly icons: SAPIcons;
	readonly httpHandler: HTTPHandler;
	readonly resourceModelData: ResourceModelData;
	readonly textDocumentTransformer: TextDocumentTransformer;
	readonly reusableMethods: ReusableMethods;
	readonly xmlParser: XMLParser;
	constructor(params?: IConstructorParams<CustomUIClass>) {
		super();
		this.syntaxAnalyser = new AcornSyntaxAnalyzer(this);
		this.classFactory = params?.classFactory || new UIClassFactory(this.syntaxAnalyser, this);
		this.configHandler = params?.configHandler || new PackageParserConfigHandler();
		this.fileReader = params?.fileReader || new FileReader(this.configHandler, this.classFactory, this);
		this.icons = new SAPIcons(this);
		this.metadataDAO = new UI5MetadataDAO(this);
		this.nodeDAO = new SAPNodeDAO(this);
		this.urlBuilder = new URLBuilder(this.configHandler, this.fileReader);
		this.httpHandler = new HTTPHandler(this.configHandler);
		this.resourceModelData = new ResourceModelData(this);
		this.textDocumentTransformer = new TextDocumentTransformer(this);
		this.reusableMethods = new ReusableMethods(this.textDocumentTransformer);
		this.xmlParser = new XMLParser(this);

		return this;
	}
}
