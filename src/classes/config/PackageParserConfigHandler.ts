import * as fs from "fs";
import { dirname, join } from "path";
import { rcFile } from "rc-config-loader";
import { toNative } from "../parsing/util/filereader/AbstractFileReader";
import { IParserConfigHandler } from "./IParserConfigHandler";

export class PackageParserConfigHandler implements IParserConfigHandler {
	static readonly configCache: { [key: string]: IUI5PackageConfigEntry } = {};
	private static _globalConfig?: IUI5PackageConfigEntry;
	static setGlobalConfigPath(fsPath: string) {
		this._globalConfig = JSON.parse(fs.readFileSync(fsPath, "utf8")) || {};
	}
	private _config!: IUI5PackageConfigEntry;
	packagePath: string;
	configPath?: string;
	constructor(packagePath = join(process.cwd(), "/package.json")) {
		this.packagePath = toNative(packagePath);
		this.loadCache();
	}

	getProxyWorkspaces(): string[] | undefined {
		this.loadCache();
		return (
			this._config.ui5?.ui5parser?.proxyWorkspaces ??
			PackageParserConfigHandler._globalConfig?.ui5?.ui5parser?.proxyWorkspaces
		);
	}

	loadCache() {
		try {
			if (PackageParserConfigHandler.configCache[this.packagePath]) {
				this._config = PackageParserConfigHandler.configCache[this.packagePath];
			} else {
				const cwd = dirname(this.packagePath);
				const { config, filePath } = rcFile("ui5plugin", { cwd: cwd, packageJSON: { fieldName: "ui5" } }) ?? {
					config: {}
				};
				if (filePath && toNative(dirname(filePath)) === toNative(cwd)) {
					this._config = filePath?.endsWith("package.json") ? { ui5: config } : config;
					PackageParserConfigHandler.configCache[this.packagePath] = this._config;
					this.configPath = filePath;
				} else {
					this._config = {};
				}
			}
		} catch (error) {
			this._config = {};
		}
	}

	getAdditionalWorkspaces() {
		return (
			this._config.ui5?.ui5parser?.additionalWorkspaces ??
			PackageParserConfigHandler._globalConfig?.ui5?.ui5parser?.additionalWorkspaces ??
			[]
		);
	}

	getUI5Version() {
		return (
			this._config?.ui5?.ui5parser?.ui5version ??
			PackageParserConfigHandler._globalConfig?.ui5?.ui5parser?.ui5version ??
			"1.108.27"
		);
	}

	getExcludeFolderPatterns() {
		const userExclusions =
			this._config?.ui5?.ui5parser?.excludeFolderPatterns ??
			PackageParserConfigHandler._globalConfig?.ui5?.ui5parser?.excludeFolderPatterns ??
			[];
		userExclusions.push("**/resources/**", "**/dist/**", "**/node_modules/**");
		return userExclusions;
	}

	getDataSource() {
		return (
			this._config?.ui5?.ui5parser?.dataSource ??
			PackageParserConfigHandler._globalConfig?.ui5?.ui5parser?.dataSource ??
			"https://ui5.sap.com/"
		);
	}

	getRejectUnauthorized() {
		return (
			this._config?.ui5?.ui5parser?.rejectUnauthorized ??
			PackageParserConfigHandler._globalConfig?.ui5?.ui5parser?.rejectUnauthorized ??
			false
		);
	}

	getLibsToLoad() {
		const additionalLibsToLoad =
			this._config?.ui5?.ui5parser?.libsToLoad ??
			PackageParserConfigHandler._globalConfig?.ui5?.ui5parser?.libsToLoad ??
			[];
		return [
			"sap.m",
			"sap.ui.comp",
			"sap.f",
			"sap.ui.core",
			"sap.ui.commons",
			"sap.ui.export",
			"sap.ui.layout",
			"sap.ui.support",
			"sap.ui.table",
			"sap.ui.unified",
			"sap.ushell",
			"sap.tnt",
			"sap.suite.ui.microchart"
		].concat(additionalLibsToLoad);
	}

	getNodeProjects() {
		return (
			this._config?.ui5?.ui5parser?.nodeProjects ??
			PackageParserConfigHandler._globalConfig?.ui5?.ui5parser?.nodeProjects ??
			[]
		);
	}
}

export interface IUI5PackageConfigEntry {
	ui5?: IUI5ParserEntry;
}

export interface IUI5ParserEntry {
	ui5parser?: IUI5ParserEntryFields;
}

export interface IUI5ParserEntryFields {
	ui5version?: string;
	excludeFolderPatterns?: string[];
	dataSource?: string;
	rejectUnauthorized?: boolean;
	libsToLoad?: string[];
	additionalWorkspaces?: string[];
	nodeProjects?: string[];
	proxyWorkspaces?: string[];
}
