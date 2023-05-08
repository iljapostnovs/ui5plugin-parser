import { IUI5Parser } from "../../../../parser/abstraction/IUI5Parser";
import { ICacheable } from "../../abstraction/ICacheable";
import { TextDocument } from "../textdocument/TextDocument";
import { WorkspaceFolder } from "../textdocument/WorkspaceFolder";
import { ITag } from "../xml/XMLParser";

export interface IFileReader {
	globalStoragePath: string | undefined;
	setNewViewContentToCache(viewContent: string, fsPath: string, forceRefresh?: boolean): void;
	setNewFragmentContentToCache(text: string, fsPath: string, forceRefresh?: boolean): void;
	getAllViews(): IView[];
	convertClassNameToFSPath(
		className: string,
		isController?: boolean,
		isFragment?: boolean,
		isView?: boolean,
		isFolder?: boolean
	): string | undefined;
	getAllManifests(): IUIManifest[];
	rereadAllManifests(): void;
	getManifestFSPathsInWorkspaceFolder(wsFolder: WorkspaceFolder): IManifestPaths[];
	getClassNameFromView(controllerClassName: string, controlId: string): string | undefined;
	getViewForController(controllerName: string): IView | undefined;
	getFragmentsMentionedInClass(className: string): IFragment[];
	getFragmentsInXMLFile(XMLFile: IXMLFile): IFragment[];
	getFirstFragmentForClass(className: string): IFragment | undefined;
	getViewText(controllerName: string): string | undefined;

	readFragments(): void;

	readViews(): void;

	readI18n(): void;

	readCustomClasses(): void;
	getAllJSClassNamesFromProject(wsFolder: WorkspaceFolder): string[];
	getControllerNameFromView(viewContent: string): string | undefined;
	getResponsibleClassForXMLDocument(document: TextDocument): string | undefined;
	getResponsibleClassNameForViewOrFragment(viewOrFragment: IXMLFile): string | undefined;
	getManifestExtensionsForClass(className: string): any | undefined;
	getFragmentsFromXMLDocumentText(documentText: string): IFragment[];
	getFragment(fragmentName: string): IFragment | undefined;
	getAllFragments(): IFragment[];
	getClassNameFromPath(fsPath: string): string | undefined;
	clearCache(): void;
	getResourceModelFiles(): {
		content: string;
		componentName: string;
	}[];
	readResourceModelFile(manifest: IUIManifest): string;
	getResourceModelUriForManifest(manifest: IUIManifest): string;
	removeFromCache(fsPath: string): boolean;
	replaceViewNames(oldName: string, newName: string): void;
	removeView(viewName: string): void;
	replaceFragmentNames(oldName: string, newName: string): void;
	getManifestForClass(className: string): IUIManifest | undefined;
	getXMLFile(className: string, fileType?: string): IXMLFile | undefined;
	getDocumentTextFromCustomClassName(className: string, isFragment?: boolean): string | undefined;
	getClassFSPathFromClassName(className: string, isFragment?: boolean): string | undefined;
	setCache(cacheType: IFileReader.CacheType, cache: string): void;
	getCache(cacheType: IFileReader.CacheType): any;
	setParser(parser: IUI5Parser): void;
	readFiles(path: string): string[];
	reloadFragmentReferences(): void;
	reEnrichAllCustomClasses(): void;
}

export interface FileData {
	content: string;
	fsPath: string;
}

export namespace IFileReader {
	export enum CacheType {
		Metadata = "1",
		APIIndex = "2",
		Icons = "3"
	}
}

export interface IUIManifest extends ICacheable {
	fsPath: string;
	componentName: string;
	content: any;
	contentString: string;
}

export interface IManifestPaths {
	fsPath: string;
}

export interface IViews {
	[key: string]: IView;
}

export interface IView extends IXMLFile, IIdClassMap {
	controllerName: string;
}
export interface IFragment extends IXMLFile, IIdClassMap {}
export interface IXMLFile extends IXMLParserCacheable, IHasFragments, ICacheable {
	content: string;
	fsPath: string;
	name: string;
}
export interface IHasFragments {
	fragments: IFragment[];
}
export interface IIdClassMap {
	idClassMap: {
		[key: string]: string;
	};
}
interface IPrefixResults {
	[key: string]: any[];
}
export interface ICommentPositions {
	[key: number]: boolean;
}
export interface IXMLParserData {
	strings: boolean[];
	tags: ITag[];
	prefixResults: IPrefixResults;
	areAllStringsClosed: boolean;
	comments?: ICommentPositions;
}
export interface IXMLParserCacheable {
	XMLParserData?: IXMLParserData;
}

export interface Fragments {
	[key: string]: IFragment;
}
