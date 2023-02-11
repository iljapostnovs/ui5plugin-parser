import glob = require("glob");
import path = require("path");
import * as fs from "fs";
import { IParserConfigHandler } from "../classes/config/IParserConfigHandler";
import { PackageParserConfigHandler } from "../classes/config/PackageParserConfigHandler";
import { HTTPHandler } from "../classes/http/HTTPHandler";
import { URLBuilder } from "../classes/http/URLBuilder";
import { SAPIcons } from "../classes/librarydata/SAPIcons";
import { SAPNodeDAO } from "../classes/librarydata/SAPNodeDAO";
import { UI5MetadataDAO } from "../classes/librarydata/UI5MetadataDAO";
import { IUIClassFactory } from "../classes/parsing/factory/IUIClassFactory";
import { AbstractCustomClass } from "../classes/parsing/ui5class/AbstractCustomClass";
import { IFileReader } from "../classes/parsing/util/filereader/IFileReader";
import { ResourceModelData } from "../classes/parsing/util/i18n/ResourceModelData";
import { TextDocumentTransformer } from "../classes/parsing/util/textdocument/TextDocumentTransformer";
import { WorkspaceFolder } from "../classes/parsing/util/textdocument/WorkspaceFolder";
import { XMLParser } from "../classes/parsing/util/xml/XMLParser";
import { ReusableMethods } from "../classes/ReusableMethods";
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

	static getIsTypescriptProject(
		workspaceFolders: WorkspaceFolder[],
		configHandler: IParserConfigHandler = new PackageParserConfigHandler()
	) {
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
