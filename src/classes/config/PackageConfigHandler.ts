import { IConfigHandler } from "./IConfigHandler";

export class PackageConfigHandler implements IConfigHandler {
	private readonly _package: any | undefined;
	constructor() {
		const packagePath = `${process.cwd()}/package.json`;
		this._package = require(packagePath);
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
		return this._package?.ui5?.ui5parser?.libsToLoad || [
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
		];
	}
}