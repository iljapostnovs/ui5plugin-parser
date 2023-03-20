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
		configHandler: IParserConfigHandler = new PackageParserConfigHandler(),
		clearCache = false
	) {
		const manifestInfos = wsFolders.flatMap(wsFolder => {
			const manifestPaths = AbstractFileReader.readFilesInWorkspace(wsFolder, "**/manifest.json", configHandler);

			return manifestPaths.map(manifestPath => ({
				path: manifestPath,
				wsFolder: wsFolder
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

	private static _createParser(manifestInfo: { path: string; wsFolder: WorkspaceFolder }): IUI5Parser {
		const isTypescriptProject = AbstractUI5Parser.getIsTypescriptProject(manifestInfo.wsFolder);
		const packagePath = join(manifestInfo.wsFolder.fsPath, "/package.json");
		const manifestFolderPath = dirname(manifestInfo.path);
		if (isTypescriptProject) {
			return new UI5TSParser({ workspaceFolder: new WorkspaceFolder(manifestFolderPath) }, packagePath);
		} else {
			return new UI5JSParser({ workspaceFolder: new WorkspaceFolder(manifestFolderPath) }, packagePath);
		}
	}
}
