import glob = require("glob");
import path = require("path");
import * as fs from "fs";
import { join } from "path";
import { IParserConfigHandler } from "../../classes/config/IParserConfigHandler";
import { PackageParserConfigHandler } from "../../classes/config/PackageParserConfigHandler";
import { HTTPHandler } from "../../classes/http/HTTPHandler";
import { URLBuilder } from "../../classes/http/URLBuilder";
import { SAPIcons } from "../../classes/librarydata/SAPIcons";
import { SAPNodeDAO } from "../../classes/librarydata/SAPNodeDAO";
import { UI5MetadataDAO } from "../../classes/librarydata/UI5MetadataDAO";
import { AbstractCustomClass } from "../../classes/parsing/ui5class/AbstractCustomClass";
import { IClassFactory } from "../../classes/parsing/ui5class/factory/IClassFactory";
import { IFileReader } from "../../classes/parsing/util/filereader/IFileReader";
import { ResourceModelData } from "../../classes/parsing/util/i18n/ResourceModelData";
import { TextDocumentTransformer } from "../../classes/parsing/util/textdocument/TextDocumentTransformer";
import { WorkspaceFolder } from "../../classes/parsing/util/textdocument/WorkspaceFolder";
import { XMLParser } from "../../classes/parsing/util/xml/XMLParser";
import { ReusableMethods } from "../../classes/ReusableMethods";
import ParserPool from "../pool/ParserPool";
import { IUI5Parser } from "./IUI5Parser";

export abstract class AbstractUI5Parser<CustomClass extends AbstractCustomClass> implements IUI5Parser<CustomClass> {
	abstract configHandler: IParserConfigHandler;
	abstract classFactory: IClassFactory<CustomClass>;
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
	abstract workspaceFolder: WorkspaceFolder;
	packagePath: string;
	private readonly _customData: Record<string, any> = {};

	constructor(packagePath: string = join(process.cwd(), "/package.json")) {
		this.packagePath = packagePath;
		ParserPool.register(this);
	}
	setCustomData(key: string, data: any): void {
		this._customData[key] = data;
	}
	getCustomData<T>(key: string): T | undefined {
		return this._customData[key];
	}

	async initializeLibsAndManifest(globalStoragePath = path.join(__dirname, "./node_modules/.cache/ui5plugin")) {
		this.fileReader.globalStoragePath = globalStoragePath;
		await this._preloadStandardLibMetadata();
		this.fileReader.rereadAllManifests();
	}

	initializeCustomClasses() {
		this.fileReader.readCustomClasses();
	}
	initializeFragments() {
		this.fileReader.readFragments();
	}
	initializeViews() {
		this.fileReader.readViews();
	}
	initializeI18n() {
		this.fileReader.readI18n();
	}

	protected async _preloadStandardLibMetadata() {
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
		workspaceFolder: WorkspaceFolder,
		configHandler: IParserConfigHandler = new PackageParserConfigHandler()
	) {
		const escapedFileSeparator = "\\" + path.sep;

		const wsFolderFSPath = workspaceFolder.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
		const exclusions: string[] = configHandler.getExcludeFolderPatterns();
		const exclusionPaths = exclusions.map(excludeString => {
			return `${wsFolderFSPath}/${excludeString}`;
		});
		const tsFiles = glob.sync(`${wsFolderFSPath}/**/*.ts`, {
			ignore: exclusionPaths
		});
		const tsConfig = glob.sync(`${wsFolderFSPath}/tsconfig.json`);

		return (!!tsFiles.length && !!tsConfig.length) || false;
	}
}
