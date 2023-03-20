import * as fs from "fs";
import { join } from "path";
import { IParserConfigHandler } from "./IParserConfigHandler";

export class PackageParserConfigHandler implements IParserConfigHandler {
	static readonly packageCache: { [key: string]: IUI5PackageConfigEntry } = {};
	private readonly _package: IUI5PackageConfigEntry;
	constructor(packagePath = join(process.cwd(), "/package.json")) {
		try {
			if (PackageParserConfigHandler.packageCache[packagePath]) {
				this._package = PackageParserConfigHandler.packageCache[packagePath];
			} else {
				this._package = JSON.parse(fs.readFileSync(packagePath, "utf8")) || {};
				PackageParserConfigHandler.packageCache[packagePath] = this._package;
			}
		} catch (error) {
			this._package = {};
		}
	}

	getUI5Version() {
		return this._package?.ui5?.ui5parser?.ui5version || "1.84.30";
	}

	getExcludeFolderPatterns() {
		return (
			this._package?.ui5?.ui5parser?.excludeFolderPatterns || [
				"**/resources/**",
				"**/dist/**/**",
				"**/node_modules/**"
			]
		);
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
}
