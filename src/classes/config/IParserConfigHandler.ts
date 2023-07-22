export interface IParserConfigHandler {
	getUI5Version(): string;
	getExcludeFolderPatterns(): string[];
	getDataSource(): string;

	getRejectUnauthorized(): boolean;

	getLibsToLoad(): string[];
	getAdditionalWorkspaces(): string[];
	getProxyWorkspaces(): string[] | undefined;
	getNodeProjects(): string[];
	packagePath: string;
	configPath?: string;
}
