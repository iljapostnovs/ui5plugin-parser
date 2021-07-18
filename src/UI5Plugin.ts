import { SAPNodeDAO } from "./classes/librarydata/SAPNodeDAO";
import { UI5MetadataPreloader } from "./classes/librarydata/UI5MetadataDAO";
import { WorkspaceFolder } from "./classes/UI5Classes/abstraction/WorkspaceFolder";
import { SAPIcons } from "./classes/UI5Classes/SAPIcons";
import { UIClassFactory } from "./classes/UI5Classes/UIClassFactory";
import { FileReader } from "./classes/utils/FileReader";
export class UI5Plugin {
	private static _instance?: UI5Plugin;
	fileReader = FileReader;
	classFactory = UIClassFactory;
	public static getInstance() {
		if (!UI5Plugin._instance) {
			UI5Plugin._instance = new UI5Plugin();
		}

		return UI5Plugin._instance;
	}

	public async initialize(wsFolders = [new WorkspaceFolder(process.cwd())]) {
		try {
			await this._preloadAllNecessaryData(wsFolders);
		} catch (error) {
			console.error("Couldn't initialize plugin: " + JSON.stringify(error.message));
		}
	}

	private async _preloadAllNecessaryData(wsFolders: WorkspaceFolder[]) {
		await this._preloadUI5Metadata();
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