import { IConfigHandler } from "./IConfigHandler";

export class PackageConfigHandler implements IConfigHandler {
	getUI5Version() {
		return "1.60.10";
	}

	getExcludeFolderPatterns() {
		return [
			"**/resources/**",
			"**/dist/**/**",
			"**/node_modules/**"
		];
	}

	getDataSource() {
		return "https://ui5.sap.com/";
	}

	getRejectUnauthorized() {
		return false;
	}

	getLibsToLoad() {
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
		];
	}
}