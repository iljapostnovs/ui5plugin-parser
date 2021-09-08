export interface IParserConfigHandler {
	getUI5Version(): string;
	getExcludeFolderPatterns(): string[];
	getDataSource(): string;

	getRejectUnauthorized(): boolean;

	getLibsToLoad(): string[];
}

interface IUI5ParserEntryFields {
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