import { SAPNodeDAO } from "./classes/librarydata/SAPNodeDAO";
import { UI5MetadataPreloader } from "./classes/librarydata/UI5MetadataDAO";
import { WorkspaceFolder } from "./classes/UI5Classes/abstraction/WorkspaceFolder";
import { SAPIcons } from "./classes/UI5Classes/SAPIcons";
import { UIClassFactory } from "./classes/UI5Classes/UIClassFactory";
import { FileReader } from "./classes/utils/FileReader";
import * as path from "path";
import { ConfigHandler } from "./classes/config/ConfigHandler";
import { IConfigHandler } from "./classes/config/IConfigHandler";

interface IConstructorParams {
	fileReader?: FileReader,
	classFactory?: UIClassFactory,
	configHandler?: IConfigHandler
}

export class UI5Plugin {
	private static _instance?: UI5Plugin;
	private _isInitialized = false;
	readonly configHandler: IConfigHandler = new ConfigHandler();

	get fileReader(): FileReader {
		if (!this._isInitialized) {
			throw new Error("Plugin must be initialized first");
		}
		return this.fileReader;
	}
	set fileReader(fileReader: FileReader) {
		this.fileReader = fileReader;
	}
	get classFactory(): UIClassFactory {
		if (!this._isInitialized) {
			throw new Error("Plugin must be initialized first");
		}
		return this.classFactory;
	}
	set classFactory(classFactory: UIClassFactory) {
		this.classFactory = classFactory;
	}

	private constructor(params?: IConstructorParams) {
		this.classFactory = params?.classFactory || new UIClassFactory();
		this.fileReader = params?.fileReader || new FileReader();
		this.configHandler = params?.configHandler || new ConfigHandler();

		return this;
	}

	public static getInstance(params?: IConstructorParams) {
		if (!UI5Plugin._instance) {
			UI5Plugin._instance = new UI5Plugin(params);
		}

		return UI5Plugin._instance;
	}

	public async initialize(wsFolders = [new WorkspaceFolder(process.cwd())]) {
		this.fileReader.globalStoragePath = path.join(process.cwd(), "./node_modules/ui5plugin-parser/cache");
		try {
			await this._preloadAllNecessaryData(wsFolders);
			this._isInitialized = true;
		} catch (error) {
			console.error("Couldn't initialize plugin: " + JSON.stringify(error.message));
		}
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