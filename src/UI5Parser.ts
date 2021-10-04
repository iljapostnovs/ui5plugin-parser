import { WorkspaceFolder } from "./classes/UI5Classes/abstraction/WorkspaceFolder";
import { UIClassFactory } from "./classes/UI5Classes/UIClassFactory";
import { FileReader } from "./classes/utils/FileReader";
import * as path from "path";
import { PackageConfigHandler } from "./classes/config/PackageConfigHandler";
import { IParserConfigHandler } from "./classes/config/IParserConfigHandler";
import { AcornSyntaxAnalyzer } from "./classes/UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { IUIClassFactory } from "./classes/UI5Classes/interfaces/IUIClassFactory";
import { IFileReader, ISyntaxAnalyser } from ".";

interface IConstructorParams {
	fileReader?: IFileReader,
	classFactory?: IUIClassFactory,
	configHandler?: IParserConfigHandler
}

export class UI5Parser {
	private static _instance?: UI5Parser;
	readonly configHandler: IParserConfigHandler;

	readonly classFactory: IUIClassFactory;
	readonly fileReader: IFileReader;
	readonly syntaxAnalyser: ISyntaxAnalyser;
	private constructor(params?: IConstructorParams) {
		this.syntaxAnalyser = new AcornSyntaxAnalyzer();
		this.classFactory = params?.classFactory || new UIClassFactory(this.syntaxAnalyser);
		this.configHandler = params?.configHandler || new PackageConfigHandler();
		this.fileReader = params?.fileReader || new FileReader(this.configHandler, this.classFactory);

		return this;
	}

	public static getInstance(params?: IConstructorParams) {
		if (!UI5Parser._instance) {
			UI5Parser._instance = new UI5Parser(params);
		}

		return UI5Parser._instance;
	}

	public async initialize(wsFolders = [new WorkspaceFolder(process.cwd())], globalStoragePath = path.join(__dirname, "./node_modules/.cache/ui5plugin")) {
		this.fileReader.globalStoragePath = globalStoragePath;
		await this._preloadAllNecessaryData(wsFolders);
	}

	private async _preloadAllNecessaryData(wsFolders: WorkspaceFolder[]) {
		await this._preloadUI5Metadata();
		this.fileReader.rereadAllManifests(wsFolders);
		this.fileReader.readAllFiles(wsFolders);
	}

	private async _preloadUI5Metadata() {
		const { URLBuilder } = await import("./classes/utils/URLBuilder");
		URLBuilder.getInstance(this.configHandler);
		const { SAPNodeDAO } = await import("./classes/librarydata/SAPNodeDAO");
		const _nodeDAO = new SAPNodeDAO();
		const SAPNodes = await _nodeDAO.getAllNodes();
		const { SAPIcons } = await import("./classes/UI5Classes/SAPIcons");
		const { UI5MetadataPreloader } = await import("./classes/librarydata/UI5MetadataDAO");
		const metadataPreloader = new UI5MetadataPreloader(SAPNodes);
		await Promise.all([
			metadataPreloader.preloadLibs(),
			SAPIcons.preloadIcons()
		]);
		console.log("Libs are preloaded");
	}
}