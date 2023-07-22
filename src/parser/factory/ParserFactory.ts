import { dirname, join } from "path";
import { IParserConfigHandler } from "../../classes/config/IParserConfigHandler";
import { PackageParserConfigHandler } from "../../classes/config/PackageParserConfigHandler";
import { AbstractFileReader } from "../../classes/parsing/util/filereader/AbstractFileReader";
import { WorkspaceFolder } from "../../classes/parsing/util/textdocument/WorkspaceFolder";
import { UI5JSNodeParser } from "../UI5JSNodeParser";
import { UI5JSParser } from "../UI5JSParser";
import { UI5TSParser } from "../UI5TSParser";
import { AbstractUI5Parser } from "../abstraction/AbstractUI5Parser";
import { IUI5Parser } from "../abstraction/IUI5Parser";
import ParserPool from "../pool/ParserPool";
import path = require("path");

export enum MessageState {
	Error,
	Warning,
	Information
}
export default class ParserFactory {
	private static _initializationMessages: { state: MessageState; message: string }[] = [];
	static getInitializationMessages() {
		return this._initializationMessages;
	}

	static async createInstances(
		wsFolders: WorkspaceFolder[],
		globalStoragePath: string = path.join(__dirname, "./node_modules/.cache/ui5plugin"),
		clearCache = false,
		globalConfigPath?: string
	) {
		if (globalConfigPath) {
			PackageParserConfigHandler.setGlobalConfigPath(globalConfigPath);
		}
		this._initializationMessages = [];
		const wsFoldersAndConfigHandlers = this._extractAllWSFoldersAndConfigHandlers(wsFolders);

		const manifestInfos = wsFoldersAndConfigHandlers.flatMap(({ wsFolder, configHandler, isNodeProject }) => {
			const manifestPaths = AbstractFileReader.readFilesInWorkspace(
				wsFolder,
				"**/manifest.json",
				isNodeProject ? undefined : configHandler
			);

			return manifestPaths.map(manifestPath => ({
				path: manifestPath,
				wsFolder: wsFolder,
				configHandler: configHandler,
				isNodeProject
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
		parsers.forEach(parser => parser.fileReader.reEnrichAllCustomClasses());

		this._addInitializationMessages(parsers);

		return ParserPool.getAllParsers();
	}

	private static _addInitializationMessages(parsers: IUI5Parser[]) {
		this._addDuplicateManifestMessages(parsers);
		parsers.forEach(parser => {
			this._addManifestQuantityMessages(parser);
		});
	}

	private static _addManifestQuantityMessages(parser: IUI5Parser) {
		const manifests = parser.fileReader.getAllManifests();
		if (manifests.length > 1) {
			this._initializationMessages.push({
				state: MessageState.Warning,
				message: `Project in workspace "${parser.workspaceFolder.fsPath}" has ${manifests.length} manifests. Nested manifest projects are not supported and might work inconsistently.`
			});
		} else if (manifests.length === 0) {
			this._initializationMessages.push({
				state: MessageState.Warning,
				message: `No manifests found for project in "${parser.workspaceFolder.fsPath}" workspace.`
			});
			ParserPool.deregister(parser);
		}
	}

	private static _addDuplicateManifestMessages(parsers: IUI5Parser[]) {
		const manifests = parsers.flatMap(parser => parser.fileReader.getAllManifests());

		const checkedManifests: string[] = [];
		manifests.forEach(currentManifest => {
			const manifestAlreadyChecked = checkedManifests.includes(currentManifest.componentName);
			if (manifestAlreadyChecked) {
				return;
			}

			const sameManifests = manifests.filter(
				manifest => manifest.componentName === currentManifest.componentName
			);
			const manifestAlreadyExists = sameManifests.length > 1;

			if (manifestAlreadyExists) {
				const manifestPaths = sameManifests.map(sameManifest => sameManifest.fsPath).join(",\n");
				this._initializationMessages.push({
					state: MessageState.Error,
					message: `Multiple manifests with same app id found: "${currentManifest.componentName}", paths: \n${manifestPaths}`
				});
			}
			checkedManifests.push(currentManifest.componentName);
		});
	}

	private static _extractAllWSFoldersAndConfigHandlers(wsFolders: WorkspaceFolder[]): {
		wsFolder: WorkspaceFolder;
		configHandler: PackageParserConfigHandler;
		isNodeProject: boolean;
	}[] {
		if (wsFolders.length === 0) {
			return [];
		}
		const wsFoldersAndConfigHandlers = wsFolders.map(wsFolder => {
			return {
				wsFolder: wsFolder,
				configHandler: this._getConfigHandlerForWorkspaceFolder(wsFolder),
				isNodeProject: false
			};
		});

		const proxyWorkspaces = wsFoldersAndConfigHandlers.filter(({ configHandler }) => {
			return !!configHandler.getProxyWorkspaces();
		});
		const nonProxyWorkspaces = wsFoldersAndConfigHandlers.filter(workspace => !proxyWorkspaces.includes(workspace));

		const additionalWorkspaces = nonProxyWorkspaces.flatMap(({ configHandler, wsFolder }) => {
			const proxyWorkspaces = configHandler.getProxyWorkspaces();
			if (proxyWorkspaces) {
				return [];
			}
			const additionalWorkspacePaths = configHandler.getAdditionalWorkspaces();
			const nodeProjects = configHandler.getNodeProjects();

			return additionalWorkspacePaths
				.map(additionalWorkspacePath => {
					const isPathAbsolute = path.isAbsolute(additionalWorkspacePath);
					const workspaceFsPath = isPathAbsolute
						? additionalWorkspacePath
						: path.join(wsFolder.fsPath, additionalWorkspacePath);
					return this._createWorkspaceFolderAndConfigHandler(workspaceFsPath);
				})
				.concat(
					nodeProjects.map(nodeProject => {
						return this._createWorkspaceFolderAndConfigHandler(
							path.join(wsFolder.fsPath, "/node_modules", `/${nodeProject}`),
							true,
							path.join(wsFolder.fsPath, "/package.json")
						);
					})
				);
		});
		nonProxyWorkspaces.push(...additionalWorkspaces);

		const proxyWorkspaceFolders = proxyWorkspaces.flatMap(({ wsFolder, configHandler }) => {
			const proxyWorkspacePaths = configHandler.getProxyWorkspaces() ?? [];

			return proxyWorkspacePaths.map(proxyWorkspacePath => {
				const resolvedProxyWorkspacePath = path.join(wsFolder.fsPath, proxyWorkspacePath);

				return new WorkspaceFolder(resolvedProxyWorkspacePath);
			});
		});
		const resolvedProxyWorkspaces = this._extractAllWSFoldersAndConfigHandlers(proxyWorkspaceFolders);

		const allWorkspaces = nonProxyWorkspaces.concat(resolvedProxyWorkspaces);
		const uniqueWorkspaces = allWorkspaces.reduce((uniqueWorkspaces: typeof allWorkspaces, workspace) => {
			const workspaceExists = uniqueWorkspaces.some(
				nonUniqueWorkspace => nonUniqueWorkspace.wsFolder.fsPath === workspace.wsFolder.fsPath
			);
			if (!workspaceExists) {
				uniqueWorkspaces.push(workspace);
			}
			return uniqueWorkspaces;
		}, []);

		return uniqueWorkspaces;
	}

	private static _createWorkspaceFolderAndConfigHandler(
		workspaceFolderPath: string,
		isNodeProject = false,
		configPath?: string
	) {
		return {
			wsFolder: new WorkspaceFolder(workspaceFolderPath),
			configHandler: new PackageParserConfigHandler(
				configPath ?? path.join(workspaceFolderPath, "/package.json")
			),
			isNodeProject
		};
	}

	private static _getConfigHandlerForWorkspaceFolder(wsFolder: WorkspaceFolder) {
		return new PackageParserConfigHandler(path.join(wsFolder.fsPath, "/package.json"));
	}

	private static _createParser(manifestInfo: {
		path: string;
		wsFolder: WorkspaceFolder;
		configHandler: IParserConfigHandler;
		isNodeProject: boolean;
	}): IUI5Parser {
		const isTypescriptProject = AbstractUI5Parser.getIsTypescriptProject(
			manifestInfo.wsFolder,
			manifestInfo.configHandler
		);
		const packagePath = join(manifestInfo.wsFolder.fsPath, "/package.json");
		const manifestFolderPath = dirname(manifestInfo.path);
		if (manifestInfo.isNodeProject) {
			return new UI5JSNodeParser(
				{ workspaceFolder: new WorkspaceFolder(manifestFolderPath), configHandler: manifestInfo.configHandler },
				packagePath
			);
		} else if (isTypescriptProject) {
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
