import { IFileReader, ISyntaxAnalyser, XMLParser } from ".";
import { AbstractUI5Parser } from "./AbstractUI5Parser";
import { IParserConfigHandler } from "./classes/config/IParserConfigHandler";
import { PackageParserConfigHandler } from "./classes/config/PackageParserConfigHandler";
import { SAPNodeDAO } from "./classes/librarydata/SAPNodeDAO";
import { UI5MetadataDAO } from "./classes/librarydata/UI5MetadataDAO";
import { IUIClassFactory } from "./classes/UI5Classes/interfaces/IUIClassFactory";
import { AcornSyntaxAnalyzer } from "./classes/UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { ResourceModelData } from "./classes/UI5Classes/ResourceModelData";
import { SAPIcons } from "./classes/UI5Classes/SAPIcons";
import { CustomUIClass } from "./classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "./classes/UI5Classes/UIClassFactory";
import { FileReader } from "./classes/utils/FileReader";
import { HTTPHandler } from "./classes/utils/HTTPHandler";
import { ReusableMethods } from "./classes/utils/ReusableMethods";
import { TextDocumentTransformer } from "./classes/utils/TextDocumentTransformer";
import { URLBuilder } from "./classes/utils/URLBuilder";
import { IConstructorParams } from "./IUI5Parser";

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
