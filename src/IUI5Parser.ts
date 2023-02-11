import { IParserConfigHandler } from "./classes/config/IParserConfigHandler";
import { SAPNodeDAO } from "./classes/librarydata/SAPNodeDAO";
import { UI5MetadataDAO } from "./classes/librarydata/UI5MetadataDAO";
import { WorkspaceFolder } from "./classes/parsing/abstraction/WorkspaceFolder";
import { IUIClassFactory } from "./classes/parsing/factory/IUIClassFactory";
import { ResourceModelData } from "./classes/parsing/ResourceModelData";
import { SAPIcons } from "./classes/parsing/SAPIcons";
import { AbstractCustomClass } from "./classes/parsing/ui5class/AbstractCustomClass";
import { HTTPHandler } from "./classes/utils/HTTPHandler";
import { IFileReader } from "./classes/utils/IFileReader";
import { ReusableMethods } from "./classes/utils/ReusableMethods";
import { TextDocumentTransformer } from "./classes/utils/TextDocumentTransformer";
import { URLBuilder } from "./classes/utils/URLBuilder";
import { XMLParser } from "./classes/utils/XMLParser";

export interface IConstructorParams<CustomClass extends AbstractCustomClass> {
	fileReader?: IFileReader;
	classFactory?: IUIClassFactory<CustomClass>;
	configHandler?: IParserConfigHandler;
}

export interface IUI5Parser<CustomClass extends AbstractCustomClass = AbstractCustomClass> {
	readonly configHandler: IParserConfigHandler;

	readonly classFactory: IUIClassFactory<CustomClass>;
	readonly fileReader: IFileReader;
	readonly nodeDAO: SAPNodeDAO;
	readonly metadataDAO: UI5MetadataDAO;
	readonly urlBuilder: URLBuilder;
	readonly icons: SAPIcons;
	readonly httpHandler: HTTPHandler;
	readonly resourceModelData: ResourceModelData;
	readonly textDocumentTransformer: TextDocumentTransformer;
	readonly reusableMethods: ReusableMethods;
	readonly xmlParser: XMLParser;

	initialize(wsFolders: WorkspaceFolder[], globalStoragePath: string): Promise<void>;

	clearCache(globalStoragePath: string): void;
}
