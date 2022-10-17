import * as fs from "fs";
import * as path from "path";
import { IFileReader } from ".";
import { IParserConfigHandler } from "./classes/config/IParserConfigHandler";
import { WorkspaceFolder } from "./classes/UI5Classes/abstraction/WorkspaceFolder";
import { IUIClassFactory } from "./classes/UI5Classes/interfaces/IUIClassFactory";
import { AbstractCustomClass } from "./classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";

export interface IConstructorParams<CustomClass extends AbstractCustomClass> {
	fileReader?: IFileReader;
	classFactory?: IUIClassFactory<CustomClass>;
	configHandler?: IParserConfigHandler;
}

export interface IUI5Parser<CustomClass extends AbstractCustomClass> {
	readonly configHandler: IParserConfigHandler;

	readonly classFactory: IUIClassFactory<CustomClass>;
	readonly fileReader: IFileReader;

	initialize(wsFolders: WorkspaceFolder[], globalStoragePath: string): Promise<void>;

	clearCache(globalStoragePath: string): void;
}

export abstract class AbstractUI5Parser<CustomClass extends AbstractCustomClass> implements IUI5Parser<CustomClass> {
	abstract configHandler: IParserConfigHandler;
	abstract classFactory: IUIClassFactory<CustomClass>;
	abstract fileReader: IFileReader;

	public async initialize(
		wsFolders = [new WorkspaceFolder(process.cwd())],
		globalStoragePath = path.join(__dirname, "./node_modules/.cache/ui5plugin")
	) {
		this.fileReader.globalStoragePath = globalStoragePath;
		await this._preloadAllNecessaryData(wsFolders);
	}

	protected async _preloadAllNecessaryData(wsFolders: WorkspaceFolder[]) {
		await this._preloadUI5Metadata();
		this.fileReader.rereadAllManifests(wsFolders);
		this.fileReader.readAllFiles(wsFolders);
	}

	protected async _preloadUI5Metadata() {
		const { URLBuilder } = await import("./classes/utils/URLBuilder");
		URLBuilder.getInstance(this.configHandler);
		const { SAPNodeDAO } = await import("./classes/librarydata/SAPNodeDAO");
		const _nodeDAO = new SAPNodeDAO();
		const SAPNodes = await _nodeDAO.getAllNodes();
		const { SAPIcons } = await import("./classes/UI5Classes/SAPIcons");
		const { UI5MetadataPreloader } = await import("./classes/librarydata/UI5MetadataDAO");
		const metadataPreloader = new UI5MetadataPreloader(SAPNodes);
		await Promise.all([metadataPreloader.preloadLibs(), SAPIcons.preloadIcons()]);
	}

	clearCache(globalStoragePath: string): void {
		fs.rmSync(globalStoragePath, {
			force: true,
			recursive: true
		});
	}

	private static _instance: AbstractUI5Parser<any>;

	static getInstance<ParserClass extends AbstractUI5Parser<CustomClass>, CustomClass extends AbstractCustomClass = AbstractCustomClass>(
		theClass: new() => ParserClass,
		params?: IConstructorParams<CustomClass>
	) {
		if (!AbstractUI5Parser._instance) {
			AbstractUI5Parser._instance = new (theClass as any)(params);
		}

		return AbstractUI5Parser._instance as unknown as ParserClass;
	}
}
