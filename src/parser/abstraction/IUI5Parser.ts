import { IParserConfigHandler } from "../../classes/config/IParserConfigHandler";
import { HTTPHandler } from "../../classes/http/HTTPHandler";
import { URLBuilder } from "../../classes/http/URLBuilder";
import { SAPIcons } from "../../classes/librarydata/SAPIcons";
import { SAPNodeDAO } from "../../classes/librarydata/SAPNodeDAO";
import { UI5MetadataDAO } from "../../classes/librarydata/UI5MetadataDAO";
import { AbstractCustomClass } from "../../classes/parsing/ui5class/AbstractCustomClass";
import { IClassFactory } from "../../classes/parsing/ui5class/factory/IClassFactory";
import { IFileReader } from "../../classes/parsing/util/filereader/IFileReader";
import { ResourceModelData } from "../../classes/parsing/util/i18n/ResourceModelData";
import { TextDocumentTransformer } from "../../classes/parsing/util/textdocument/TextDocumentTransformer";
import { WorkspaceFolder } from "../../classes/parsing/util/textdocument/WorkspaceFolder";
import { XMLParser } from "../../classes/parsing/util/xml/XMLParser";
import { ReusableMethods } from "../../classes/ReusableMethods";

export interface IConstructorParams<CustomClass extends AbstractCustomClass> {
	fileReader?: IFileReader;
	classFactory?: IClassFactory<CustomClass>;
	configHandler?: IParserConfigHandler;
	workspaceFolder: WorkspaceFolder;
}

export interface IUI5Parser<CustomClass extends AbstractCustomClass = AbstractCustomClass> {
	readonly configHandler: IParserConfigHandler;
	readonly classFactory: IClassFactory<CustomClass>;
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
	readonly workspaceFolder: WorkspaceFolder;
	readonly packagePath: string;

	setCustomData(key: string, data: any): void;
	getCustomData<T>(key: string): T | undefined;

	initializeLibsAndManifest(globalStoragePath: string): Promise<void>;
	initializeFragments(): void;
	initializeViews(): void;
	initializeI18n(): void;

	initializeCustomClasses(): void;

	clearCache(globalStoragePath: string): void;
}
