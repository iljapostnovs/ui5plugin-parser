import * as path from "path";
import { Project, SourceFile, ts } from "ts-morph";
import { IParserConfigHandler } from "../classes/config/IParserConfigHandler";
import { PackageParserConfigHandler } from "../classes/config/PackageParserConfigHandler";
import { HTTPHandler } from "../classes/http/HTTPHandler";
import { URLBuilder } from "../classes/http/URLBuilder";
import { SAPIcons } from "../classes/librarydata/SAPIcons";
import { SAPNodeDAO } from "../classes/librarydata/SAPNodeDAO";
import { UI5MetadataDAO } from "../classes/librarydata/UI5MetadataDAO";
import { TSClassFactory } from "../classes/parsing/factory/TSClassFactory";
import { CustomTSClass } from "../classes/parsing/ui5class/ts/CustomTSClass";
import { CustomTSObject } from "../classes/parsing/ui5class/ts/CustomTSObject";
import { IFileReader } from "../classes/parsing/util/filereader/IFileReader";
import { TSFileReader } from "../classes/parsing/util/filereader/TSFileReader";
import { ResourceModelData } from "../classes/parsing/util/i18n/ResourceModelData";
import { TextDocumentTransformer } from "../classes/parsing/util/textdocument/TextDocumentTransformer";
import { WorkspaceFolder } from "../classes/parsing/util/textdocument/WorkspaceFolder";
import { XMLParser } from "../classes/parsing/util/xml/XMLParser";
import { ReusableMethods } from "../classes/ReusableMethods";
import { AbstractUI5Parser } from "./abstraction/AbstractUI5Parser";
import { IConstructorParams } from "./abstraction/IUI5Parser";
import glob = require("glob");

export interface UI5TSParserConstructor extends IConstructorParams<CustomTSClass | CustomTSObject> {
	classFactory: TSClassFactory;
}

export class UI5TSParser extends AbstractUI5Parser<CustomTSClass | CustomTSObject> {
	readonly configHandler: IParserConfigHandler;
	readonly classFactory: TSClassFactory;
	readonly fileReader: IFileReader;
	readonly tsProjects: Project[] = [];
	readonly nodeDAO: SAPNodeDAO;
	readonly metadataDAO: UI5MetadataDAO;
	readonly urlBuilder: URLBuilder;
	readonly icons: SAPIcons;
	readonly httpHandler: HTTPHandler;
	readonly resourceModelData: ResourceModelData;
	readonly textDocumentTransformer: TextDocumentTransformer;
	readonly reusableMethods: ReusableMethods;
	readonly xmlParser: XMLParser;

	constructor(params?: UI5TSParserConstructor) {
		super();
		this.classFactory = params?.classFactory || new TSClassFactory(this);
		this.configHandler = params?.configHandler || new PackageParserConfigHandler();
		this.fileReader = params?.fileReader || new TSFileReader(this.configHandler, this.classFactory, this);
		this.icons = new SAPIcons(this);
		this.metadataDAO = new UI5MetadataDAO(this);
		this.nodeDAO = new SAPNodeDAO(this);
		this.urlBuilder = new URLBuilder(this.configHandler, this.fileReader);
		this.httpHandler = new HTTPHandler(this.configHandler);
		this.resourceModelData = new ResourceModelData(this);
		this.textDocumentTransformer = new TextDocumentTransformer(this);
		this.reusableMethods = new ReusableMethods(this.textDocumentTransformer);
		this.xmlParser = new XMLParser(this);
	}

	getProject(fsPath: string) {
		return this.tsProjects.find(tsProject => {
			const [rootDirectory] = tsProject.getRootDirectories();
			return (
				!!tsProject.getSourceFile(fsPath) ||
				(rootDirectory && path.normalize(fsPath).includes(path.normalize(rootDirectory.getPath())))
			);
		});
	}

	processSourceFiles(project: Project, changedFiles: SourceFile[]) {
		const tsSourceFiles = changedFiles.filter(sourceFile => !sourceFile.compilerNode.fileName.endsWith(".d.ts"));
		tsSourceFiles.forEach(sourceFile => {
			const className = this.fileReader.getClassNameFromPath(sourceFile.compilerNode.fileName);
			if (className) {
				this.classFactory.setNewCodeForClass(
					className,
					sourceFile.getFullText(),
					false,
					sourceFile,
					project,
					false
				);
			}
		});
	}

	protected async _preloadAllNecessaryData(wsFolders: WorkspaceFolder[]) {
		const validWsFolders = this._getValidWsFolders(wsFolders);
		const initializedProjects = validWsFolders.map(wsFolder => {
			const { project, paths, sourceFiles } = this._initializeTS(wsFolder.fsPath);
			const projectPaths = paths.map(initializedPath =>
				path.resolve(wsFolder.fsPath, initializedPath.replace(/\*/g, ""))
			);

			return { projectPaths, sourceFiles, project };
		});
		const paths = initializedProjects.flatMap(project => project.projectPaths);
		const notDuplicatedPaths = paths.filter(initializedPath => {
			return !validWsFolders.some(wsFolder => initializedPath.startsWith(wsFolder.fsPath));
		});
		const tsWsFolders = notDuplicatedPaths.map(path => new WorkspaceFolder(path));

		await super._preloadAllNecessaryData(tsWsFolders.concat(validWsFolders));

		initializedProjects.forEach(initializedProject => {
			this.processSourceFiles(initializedProject.project, initializedProject.sourceFiles);
		});
	}

	private _getValidWsFolders(wsFolders: WorkspaceFolder[]) {
		return wsFolders.filter(wsFolder => {
			const escapedFileSeparator = "\\" + path.sep;
			const wsFolderFSPath = wsFolder.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
			const exclusions: string[] = this.configHandler.getExcludeFolderPatterns();
			const exclusionPaths = exclusions.map(excludeString => {
				return `${wsFolderFSPath}/${excludeString}`;
			});
			const tsFiles = glob.sync(`${wsFolderFSPath}/**/*.ts`, {
				ignore: exclusionPaths
			});
			const tsconfig = glob.sync(`${wsFolderFSPath}/tsconfig.json`);
			const manifest = glob.sync(`${wsFolderFSPath}/**/manifest.json`, {
				ignore: exclusionPaths
			});

			return tsFiles.length > 0 && tsconfig.length > 0 && manifest.length > 0;
		});
	}

	_initializeTS(folderPath: string) {
		const configPath = ts.findConfigFile(folderPath, ts.sys.fileExists, "tsconfig.json");
		if (!configPath) {
			throw new Error("Could not find a valid 'tsconfig.json'.");
		}
		const project = new Project({
			tsConfigFilePath: configPath
		});
		this.tsProjects.push(project);

		const sourceFiles = project.getSourceFiles();

		const pathMap = project.getCompilerOptions().paths;
		const paths = pathMap ? Object.keys(pathMap).flatMap(key => pathMap[key]) : [];

		return { paths, sourceFiles, project };
	}
}
