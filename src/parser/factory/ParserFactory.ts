import { dirname, join } from "path";
import { IParserConfigHandler } from "../../classes/config/IParserConfigHandler";
import { PackageParserConfigHandler } from "../../classes/config/PackageParserConfigHandler";
import { AbstractFileReader } from "../../classes/parsing/util/filereader/AbstractFileReader";
import { WorkspaceFolder } from "../../classes/parsing/util/textdocument/WorkspaceFolder";
import { AbstractUI5Parser } from "../abstraction/AbstractUI5Parser";
import { IUI5Parser } from "../abstraction/IUI5Parser";
import { UI5JSParser } from "../UI5JSParser";
import { UI5TSParser } from "../UI5TSParser";
import path = require("path");

export default class ParserFactory {
	static async createInstances(
		wsFolders: WorkspaceFolder[],
		globalStoragePath: string = path.join(__dirname, "./node_modules/.cache/ui5plugin"),
		clearCache = false
	) {
		const wsFoldersAndConfigHandlers = this._extractAllWSFoldersAndConfigHandlers(wsFolders);

		const manifestInfos = wsFoldersAndConfigHandlers.flatMap(({ wsFolder, configHandler }) => {
			const manifestPaths = AbstractFileReader.readFilesInWorkspace(wsFolder, "**/manifest.json", configHandler);

			return manifestPaths.map(manifestPath => ({
				path: manifestPath,
				wsFolder: wsFolder,
				configHandler: configHandler
			}));
		});

		const parsers = manifestInfos.map(manifestInfo => this._createParser(manifestInfo));

		if (clearCache) {
			parsers.forEach(parser => {
				parser.fileReader.clearCache();
			});
		}
		const initializations = parsers.map(parser => parser.initializeLibsAndManifest(globalStoragePath));
		await Promise.all(initializations);
		parsers.forEach(parser => parser.initializeFragments());
		parsers.forEach(parser => parser.fileReader.reloadFragmentReferences());
		parsers.forEach(parser => parser.initializeViews());
		parsers.forEach(parser => parser.initializeI18n());
		parsers.forEach(parser => parser.initializeCustomClasses());

		return parsers;
	}

	private static _extractAllWSFoldersAndConfigHandlers(wsFolders: WorkspaceFolder[]) {
		const wsFoldersAndConfigHandlers = wsFolders.map(wsFolder => {
			return {
				wsFolder: wsFolder,
				configHandler: new PackageParserConfigHandler(path.join(wsFolder.fsPath, "/package.json"))
			};
		});
		const resolvedAdditionalWorkspaces = wsFoldersAndConfigHandlers.flatMap(({ configHandler, wsFolder }) => {
			const additionalWorkspacePaths = configHandler.getAdditionalWorkspaces();
			return additionalWorkspacePaths.map(additionalWorkspacePath => {
				const workspaceFsPath = path.join(wsFolder.fsPath, additionalWorkspacePath);
				return {
					wsFolder: new WorkspaceFolder(workspaceFsPath),
					configHandler: new PackageParserConfigHandler(path.join(workspaceFsPath, "/package.json"))
				};
			});
		});
		wsFoldersAndConfigHandlers.push(...resolvedAdditionalWorkspaces);
		return wsFoldersAndConfigHandlers;
	}

	private static _createParser(manifestInfo: {
		path: string;
		wsFolder: WorkspaceFolder;
		configHandler: IParserConfigHandler;
	}): IUI5Parser {
		const isTypescriptProject = AbstractUI5Parser.getIsTypescriptProject(manifestInfo.wsFolder);
		const packagePath = join(manifestInfo.wsFolder.fsPath, "/package.json");
		const manifestFolderPath = dirname(manifestInfo.path);
		if (isTypescriptProject) {
			return new UI5TSParser(
				{ workspaceFolder: new WorkspaceFolder(manifestFolderPath), configHandler: manifestInfo.configHandler },
				packagePath
			);
		} else {
			return new UI5JSParser(
				{ workspaceFolder: new WorkspaceFolder(manifestFolderPath), configHandler: manifestInfo.configHandler },
				packagePath
			);
		}
	}
}
