import { IParserConfigHandler } from "./IParserConfigHandler";
import { join } from "path";

export class PackageParserConfigHandler implements IParserConfigHandler {
	private readonly _package: IUI5PackageConfigEntry | undefined;
	constructor(packagePath = join(process.cwd(), "/package.json")) {
		try {
			this._package = require(packagePath);
		} catch (error) {
			this._package = {};
		}
	}

	getUI5Version() {
		return this._package?.ui5?.ui5parser?.ui5version || "1.60.10";
	}

	getExcludeFolderPatterns() {
		return this._package?.ui5?.ui5parser?.excludeFolderPatterns || [
			"**/resources/**",
			"**/dist/**/**",
			"**/node_modules/**"
		];
	}

	getDataSource() {
		return this._package?.ui5?.ui5parser?.dataSource || "https://ui5.sap.com/";
	}

	getRejectUnauthorized() {
		return this._package?.ui5?.ui5parser?.rejectUnauthorized || false;
	}

	getLibsToLoad() {
		const additionalLibsToLoad = this._package?.ui5?.ui5parser?.libsToLoad || [];
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
}

export interface IUI5ParserEntryFields {
	ui5version?: string;
	excludeFolderPatterns?: string[];
	dataSource?: string;
	rejectUnauthorized?: boolean;
	libsToLoad?: string[];
}

export interface IUI5ParserEntry {
	ui5parser?: IUI5ParserEntryFields
}

export interface IUI5PackageConfigEntry {
	ui5?: IUI5ParserEntry
}