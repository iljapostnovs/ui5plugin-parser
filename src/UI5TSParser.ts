import * as path from "path";
import { Project, SourceFile, ts } from "ts-morph";
import { TSFileReader } from "./classes/utils/TSFileReader";
import { IFileReader } from "./classes/utils/IFileReader";
import { IParserConfigHandler } from "./classes/config/IParserConfigHandler";
import { PackageParserConfigHandler } from "./classes/config/PackageParserConfigHandler";
import { WorkspaceFolder } from "./classes/UI5Classes/abstraction/WorkspaceFolder";
import { TSClassFactory } from "./classes/UI5Classes/TSClassFactory";
import { AbstractUI5Parser, IConstructorParams } from "./IUI5Parser";
import { CustomTSClass } from "./classes/UI5Classes/UI5Parser/UIClass/CustomTSClass";
import { CustomTSObject } from "./classes/UI5Classes/UI5Parser/UIClass/CustomTSObject";

export interface UI5TSParserConstructor extends IConstructorParams<CustomTSClass | CustomTSObject> {
	classFactory: TSClassFactory;
}

export class UI5TSParser extends AbstractUI5Parser<CustomTSClass | CustomTSObject> {
	readonly configHandler: IParserConfigHandler;
	readonly classFactory: TSClassFactory;
	readonly fileReader: IFileReader;
	readonly tsProjects: Project[] = [];

	constructor(params?: UI5TSParserConstructor) {
		super();
		this.classFactory = params?.classFactory || new TSClassFactory();
		this.configHandler = params?.configHandler || new PackageParserConfigHandler();
		this.fileReader = params?.fileReader || new TSFileReader(this.configHandler, this.classFactory);
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
		const initializedProjects = wsFolders.map(wsFolder => {
			const { project, paths, sourceFiles } = this._initializeTS(wsFolder.fsPath);
			const projectPaths = paths.map(initializedPath =>
				path.resolve(wsFolder.fsPath, initializedPath.replace(/\*/g, ""))
			);

			return { projectPaths, sourceFiles, project };
		});
		const paths = initializedProjects.flatMap(project => project.projectPaths);
		const notDuplicatedPaths = paths.filter(initializedPath => {
			return !wsFolders.some(wsFolder => initializedPath.startsWith(wsFolder.fsPath));
		});
		const tsWsFolders = notDuplicatedPaths.map(path => new WorkspaceFolder(path));

		await super._preloadAllNecessaryData(tsWsFolders.concat(wsFolders));

		initializedProjects.forEach(initializedProject => {
			this.processSourceFiles(initializedProject.project, initializedProject.sourceFiles);
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

		return { paths, sourceFiles: sourceFiles, project };
	}
}
