import { WorkspaceFolder, TextDocument } from "../..";
import { IView, IXMLFile, IFragment, IUIManifest, IManifestPaths } from "./FileReader";

export interface IFileReader {
	globalStoragePath: string | undefined
	setNewViewContentToCache(viewContent: string, fsPath: string, forceRefresh?: boolean): void
	setNewFragmentContentToCache(text: string, fsPath: string, forceRefresh?: boolean): void
	getAllViews(): IView[]
	convertClassNameToFSPath(className: string, isController?: boolean, isFragment?: boolean, isView?: boolean, isFolder?: boolean): string | undefined
	getAllManifests(): IUIManifest[]
	rereadAllManifests(wsFolders: WorkspaceFolder[]): void
	getManifestFSPathsInWorkspaceFolder(wsFolder: WorkspaceFolder): IManifestPaths[]
	getClassNameFromView(controllerClassName: string, controlId: string): string | undefined
	getViewForController(controllerName: string): IView | undefined
	getFragmentsMentionedInClass(className: string): IFragment[]
	getFragmentsInXMLFile(XMLFile: IXMLFile): IFragment[]
	getFirstFragmentForClass(className: string): IFragment | undefined
	getViewText(controllerName: string): string | undefined
	readAllFiles(wsFolders: WorkspaceFolder[]): void
	getAllJSClassNamesFromProject(wsFolder: WorkspaceFolder): string[]
	getControllerNameFromView(viewContent: string): string | undefined
	getResponsibleClassForXMLDocument(document: TextDocument): string | undefined
	getResponsibleClassNameForViewOrFragment(viewOrFragment: IXMLFile): string | undefined
	getManifestExtensionsForClass(className: string): any | undefined
	getFragmentsFromXMLDocumentText(documentText: string): IFragment[]
	getFragment(fragmentName: string): IFragment | undefined
	getAllFragments(): IFragment[]
	getClassNameFromPath(fsPath: string): string | undefined
	clearCache(): void
	getResourceModelFiles(): {
		content: string;
		componentName: string;
	}[]
	readResourceModelFile(manifest: IUIManifest): string
	getResourceModelUriForManifest(manifest: IUIManifest): string
	removeFromCache(fsPath: string): boolean
	replaceViewNames(oldName: string, newName: string): void
	removeView(viewName: string): void
	replaceFragmentNames(oldName: string, newName: string): void
	getManifestForClass(className: string): IUIManifest | undefined
}