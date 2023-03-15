import * as path from "path";
import { Project, SourceFile, ts } from "ts-morph";
import { IParserConfigHandler } from "../classes/config/IParserConfigHandler";
import { PackageParserConfigHandler } from "../classes/config/PackageParserConfigHandler";
import { HTTPHandler } from "../classes/http/HTTPHandler";
import { URLBuilder } from "../classes/http/URLBuilder";
import { SAPIcons } from "../classes/librarydata/SAPIcons";
import { SAPNodeDAO } from "../classes/librarydata/SAPNodeDAO";
import { UI5MetadataDAO } from "../classes/librarydata/UI5MetadataDAO";
import { TSClassFactory } from "../classes/parsing/ui5class/factory/TSClassFactory";
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

export interface UI5TSParserConstructor extends IConstructorParams<CustomTSClass | CustomTSObject> {
	classFactory?: TSClassFactory;
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
	readonly workspaceFolder: WorkspaceFolder;

	constructor(params: UI5TSParserConstructor, packagePath?: string) {
		super(packagePath);
		this.workspaceFolder = params.workspaceFolder;
		this.classFactory = params?.classFactory || new TSClassFactory();
		this.classFactory.setParser(this);
		this.configHandler = params?.configHandler || new PackageParserConfigHandler(packagePath);
		this.fileReader = params?.fileReader || new TSFileReader(this.configHandler, this.classFactory);
		this.fileReader.setParser(this);
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

	initializeCustomClasses() {
		const { project, sourceFiles } = this._initializeTS(this.workspaceFolder.fsPath);
		this.processSourceFiles(project, sourceFiles);
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
