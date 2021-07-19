import { SAPNodeDAO } from "./classes/librarydata/SAPNodeDAO";
import { UI5MetadataPreloader } from "./classes/librarydata/UI5MetadataDAO";
import { WorkspaceFolder } from "./classes/UI5Classes/abstraction/WorkspaceFolder";
import { SAPIcons } from "./classes/UI5Classes/SAPIcons";
import { UIClassFactory } from "./classes/UI5Classes/UIClassFactory";
import { FileReader } from "./classes/utils/FileReader";
import * as path from "path";
import { ConfigHandler } from "./classes/config/ConfigHandler";
export class UI5Plugin {
	private static _instance?: UI5Plugin;
	fileReader = new FileReader();
	classFactory = new UIClassFactory();
	configHandler = new ConfigHandler();

	private constructor() {
		return this;
	}

	public static getInstance() {
		if (!UI5Plugin._instance) {
			UI5Plugin._instance = new UI5Plugin();
		}

		return UI5Plugin._instance;
	}

	public async initialize(wsFolders = [new WorkspaceFolder(process.cwd())]) {
		this.fileReader.globalStoragePath = path.join(process.cwd(), "./node_modules/ui5plugin-parser/cache");
		try {
			await this._preloadAllNecessaryData(wsFolders);
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