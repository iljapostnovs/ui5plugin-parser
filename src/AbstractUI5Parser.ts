import glob = require("glob");
import path = require("path");
import * as fs from "fs";
import { IParserConfigHandler } from "./classes/config/IParserConfigHandler";
import { PackageParserConfigHandler } from "./classes/config/PackageParserConfigHandler";
import { SAPNodeDAO } from "./classes/librarydata/SAPNodeDAO";
import { UI5MetadataDAO } from "./classes/librarydata/UI5MetadataDAO";
import { WorkspaceFolder } from "./classes/UI5Classes/abstraction/WorkspaceFolder";
import { IUIClassFactory } from "./classes/UI5Classes/interfaces/IUIClassFactory";
import { ResourceModelData } from "./classes/UI5Classes/ResourceModelData";
import { SAPIcons } from "./classes/UI5Classes/SAPIcons";
import { AbstractCustomClass } from "./classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import { HTTPHandler } from "./classes/utils/HTTPHandler";
import { IFileReader } from "./classes/utils/IFileReader";
import { ReusableMethods } from "./classes/utils/ReusableMethods";
import { TextDocumentTransformer } from "./classes/utils/TextDocumentTransformer";
import { URLBuilder } from "./classes/utils/URLBuilder";
import { XMLParser } from "./classes/utils/XMLParser";
import { IUI5Parser } from "./IUI5Parser";


export abstract class AbstractUI5Parser<CustomClass extends AbstractCustomClass> implements IUI5Parser<CustomClass> {
	abstract configHandler: IParserConfigHandler;
	abstract classFactory: IUIClassFactory<CustomClass>;
	abstract fileReader: IFileReader;
	abstract nodeDAO: SAPNodeDAO;
	abstract metadataDAO: UI5MetadataDAO;
	abstract urlBuilder: URLBuilder;
	abstract icons: SAPIcons;
	abstract httpHandler: HTTPHandler;
	abstract resourceModelData: ResourceModelData;
	abstract textDocumentTransformer: TextDocumentTransformer;
	abstract reusableMethods: ReusableMethods;
	abstract xmlParser: XMLParser;


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
		const SAPNodes = await this.nodeDAO.getAllNodes();
		await Promise.all([this.metadataDAO.loadMetadata(SAPNodes), this.icons.preloadIcons()]);
		this.nodeDAO.recursiveModuleAssignment();
	}

	clearCache(globalStoragePath: string): void {
		fs.rmSync(globalStoragePath, {
			force: true,
			recursive: true
		});
	}

	static getIsTypescriptProject(workspaceFolders: WorkspaceFolder[], configHandler: IParserConfigHandler = new PackageParserConfigHandler()) {
		const escapedFileSeparator = "\\" + path.sep;

		const tsFiles = workspaceFolders?.flatMap(wsFolder => {
			const wsFolderFSPath = wsFolder.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
			const exclusions: string[] = configHandler.getExcludeFolderPatterns();
			const exclusionPaths = exclusions.map(excludeString => {
				return `${wsFolderFSPath}/${excludeString}`;
			});
			return glob.sync(`${wsFolderFSPath}/**/*.ts`, {
				ignore: exclusionPaths
			});
		});
		const tsconfig = workspaceFolders?.flatMap(wsFolder => {
			const wsFolderFSPath = wsFolder.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
			return glob.sync(`${wsFolderFSPath}/tsconfig.json`);
		});

		return (!!tsFiles?.length && !!tsconfig?.length) || false;
	}
}
