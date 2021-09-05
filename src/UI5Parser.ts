import { SAPNodeDAO } from "./classes/librarydata/SAPNodeDAO";
import { UI5MetadataPreloader } from "./classes/librarydata/UI5MetadataDAO";
import { WorkspaceFolder } from "./classes/UI5Classes/abstraction/WorkspaceFolder";
import { SAPIcons } from "./classes/UI5Classes/SAPIcons";
import { UIClassFactory } from "./classes/UI5Classes/UIClassFactory";
import { FileReader } from "./classes/utils/FileReader";
import * as path from "path";
import { PackageConfigHandler } from "./classes/config/PackageConfigHandler";
import { IConfigHandler } from "./classes/config/IConfigHandler";
import { AcornSyntaxAnalyzer } from "./classes/UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { URLBuilder } from "./classes/utils/URLBuilder";
import { IUIClassFactory } from "./classes/UI5Classes/interfaces/IUIClassFactory";
import { XMLParser } from "./classes/utils/XMLParser";
import { ISyntaxAnalyser } from ".";

interface IConstructorParams {
	fileReader?: FileReader,
	classFactory?: IUIClassFactory,
	configHandler?: IConfigHandler
}

export class UI5Parser {
	private static _instance?: UI5Parser;
	readonly configHandler: IConfigHandler;

	readonly classFactory: IUIClassFactory;
	readonly fileReader: FileReader;
	readonly syntaxAnalyser: ISyntaxAnalyser;
	readonly XMLParser: XMLParser = XMLParser;
	private constructor(params?: IConstructorParams) {
		this.syntaxAnalyser = new AcornSyntaxAnalyzer();
		this.classFactory = params?.classFactory || new UIClassFactory(this.syntaxAnalyser);
		this.configHandler = params?.configHandler || new PackageConfigHandler();
		this.fileReader = params?.fileReader || new FileReader(this.configHandler, this.classFactory);
		URLBuilder.getInstance(this.configHandler);

		return this;
	}

	public static getInstance(params?: IConstructorParams) {
		if (!UI5Parser._instance) {
			UI5Parser._instance = new UI5Parser(params);
		}

		return UI5Parser._instance;
	}

	public async initialize(wsFolders = [new WorkspaceFolder(process.cwd())]) {
		this.fileReader.globalStoragePath = path.join(process.cwd(), "./node_modules/.cache/ui5plugin");
		await this._preloadAllNecessaryData(wsFolders);
	}

	private async _preloadAllNecessaryData(wsFolders: WorkspaceFolder[]) {
		await this._preloadUI5Metadata();
		this.fileReader.rereadAllManifests(wsFolders);
		this.fileReader.readAllFiles(wsFolders);
	}

	private async _preloadUI5Metadata() {
		const _nodeDAO = new SAPNodeDAO();
		const SAPNodes = await _nodeDAO.getAllNodes();

		const metadataPreloader: UI5MetadataPreloader = new UI5MetadataPreloader(SAPNodes);
		await Promise.all([
			metadataPreloader.preloadLibs(),
			SAPIcons.preloadIcons()
		]);
		console.log("Libs are preloaded");
	}
}