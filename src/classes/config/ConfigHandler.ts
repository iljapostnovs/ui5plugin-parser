export class ConfigHandler {
	static getUI5Version() {
		return "1.60.10";
	}
	static getExcludeFolderPatterns() {
		return [
			"**/resources/**",
			"**/dist/**/**",
			"**/node_modules/**"
		];
	}
	static getDataSource() {
		return "https://ui5.sap.com/";
	}

	static getRejectUnauthorized() {
		return false;
	}

	static getLibsToLoad() {
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