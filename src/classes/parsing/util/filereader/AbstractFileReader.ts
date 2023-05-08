import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import { IUI5Parser } from "../../../../parser/abstraction/IUI5Parser";
import ParserPool from "../../../../parser/pool/ParserPool";
import { IParserConfigHandler } from "../../../config/IParserConfigHandler";
import { AbstractCustomClass } from "../../ui5class/AbstractCustomClass";
import { IClassFactory } from "../../ui5class/factory/IClassFactory";
import { TextDocument } from "../textdocument/TextDocument";
import { WorkspaceFolder } from "../textdocument/WorkspaceFolder";
import {
	Fragments,
	IFileReader,
	IFragment,
	IIdClassMap,
	IManifestPaths,
	IUIManifest,
	IView,
	IViews,
	IXMLFile
} from "./IFileReader";
const fileSeparator = path.sep;
const escapedFileSeparator = "\\" + path.sep;

export abstract class AbstractFileReader<CustomClass extends AbstractCustomClass, Parser extends IUI5Parser>
	implements IFileReader
{
	protected _manifests: IUIManifest[] = [];
	private static readonly _classNameToPathCache: Record<string, string | undefined> = {};
	private static readonly _pathToClassNameCache: Record<string, string | undefined> = {};
	protected readonly _viewCache: IViews = {};
	protected readonly _fragmentCache: Fragments = {};
	protected readonly _UI5Version: string;
	globalStoragePath: string | undefined;
	protected readonly _configHandler: IParserConfigHandler;
	protected readonly _classFactory: IClassFactory<CustomClass>;
	protected _parser!: Parser;

	constructor(configHandler: IParserConfigHandler, classFactory: IClassFactory<CustomClass>) {
		this._configHandler = configHandler;
		this._UI5Version = configHandler.getUI5Version();
		this._classFactory = classFactory;
	}

	abstract reEnrichAllCustomClasses(): void;

	setParser(parser: Parser) {
		this._parser = parser;
	}

	reloadFragmentReferences() {
		this.getAllFragments().forEach(fragment => {
			fragment.fragments = this.getFragmentsFromXMLDocumentText(fragment.content);
		});
		this.getAllViews().forEach(view => {
			view.fragments = this.getFragmentsFromXMLDocumentText(view.content);
		});
	}

	setNewViewContentToCache(viewContent: string, fsPath: string, forceRefresh = false) {
		const viewName = this.getClassNameFromPath(fsPath);
		if (
			viewName &&
			(this._viewCache[viewName]?.content.length !== viewContent.length ||
				forceRefresh ||
				!this._viewCache[viewName])
		) {
			if (this._viewCache[viewName]) {
				this._viewCache[viewName].content = viewContent;
				this._viewCache[viewName].controllerName = this.getControllerNameFromView(viewContent) || "";
				this._viewCache[viewName].idClassMap = {};
				this._viewCache[viewName].fsPath = fsPath;
				this._viewCache[viewName].fragments = this.getFragmentsFromXMLDocumentText(viewContent);
				this._viewCache[viewName].XMLParserData = undefined;
				(this._viewCache[viewName] as any)._cache = {};
			} else {
				this._viewCache[viewName] = {
					controllerName: this.getControllerNameFromView(viewContent) || "",
					idClassMap: {},
					name: viewName || "",
					content: viewContent,
					fsPath: fsPath,
					fragments: this.getFragmentsFromXMLDocumentText(viewContent),
					getCache: function <Type>(cacheName: string) {
						return <Type>(this as any)._cache[cacheName];
					},
					setCache: function <Type>(cacheName: string, cacheValue: Type) {
						(this as any)._cache[cacheName] = cacheValue;
					}
				};
				(this._viewCache[viewName] as any)._cache = {};
			}
		}
	}

	setNewFragmentContentToCache(text: string, fsPath: string, forceRefresh = false) {
		const fragmentName = this.getClassNameFromPath(fsPath);
		if (
			fragmentName &&
			(this._fragmentCache[fragmentName]?.content.length !== text.length ||
				forceRefresh ||
				!this._fragmentCache[fragmentName])
		) {
			if (this._fragmentCache[fragmentName]) {
				this._fragmentCache[fragmentName].content = text;
				this._fragmentCache[fragmentName].fsPath = fsPath;
				this._fragmentCache[fragmentName].name = fragmentName;
				this._fragmentCache[fragmentName].idClassMap = {};
				this._fragmentCache[fragmentName].fragments = this.getFragmentsFromXMLDocumentText(text);
				this._fragmentCache[fragmentName].XMLParserData = undefined;
				(this._fragmentCache[fragmentName] as any)._cache = {};
			} else {
				this._fragmentCache[fragmentName] = {
					content: text,
					fsPath: fsPath,
					name: fragmentName,
					idClassMap: {},
					fragments: this.getFragmentsFromXMLDocumentText(text),
					getCache: function <Type>(cacheName: string) {
						return <Type>(this as any)._cache[cacheName];
					},
					setCache: function <Type>(cacheName: string, cacheValue: Type) {
						(this as any)._cache[cacheName] = cacheValue;
					}
				};
				(this._fragmentCache[fragmentName] as any)._cache = {};
			}
		}
	}

	getAllViews() {
		return Object.keys(this._viewCache).map(key => this._viewCache[key]);
	}

	getDocumentTextFromCustomClassName(className: string, isFragment?: boolean) {
		let documentText;
		const classPath = this.getClassFSPathFromClassName(className, isFragment);
		if (classPath && this._checkIfFileExistsCaseSensitive(classPath)) {
			documentText = fs.readFileSync(classPath, "utf8");
		}

		return documentText;
	}

	protected _checkIfFileExistsCaseSensitive(filepath: string): boolean {
		const directoryName = path.dirname(filepath);
		if (directoryName === path.dirname(directoryName)) {
			return true;
		}

		try {
			const fileNames = fs.readdirSync(directoryName);
			if (fileNames.indexOf(path.basename(filepath)) === -1) {
				return false;
			}
		} catch (error) {
			return false;
		}

		return this._checkIfFileExistsCaseSensitive(directoryName);
	}

	getClassFSPathFromClassName(className: string, isFragment?: boolean) {
		if (AbstractFileReader._pathToClassNameCache[`${className},${isFragment}`]) {
			return AbstractFileReader._pathToClassNameCache[`${className},${isFragment}`];
		}

		let classPath = this.convertClassNameToFSPath(className, false, isFragment);

		if (classPath) {
			const fileExists = fs.existsSync(classPath);
			if (!fileExists) {
				classPath = this.convertClassNameToFSPath(className, true);
				if (classPath && !fs.existsSync(classPath)) {
					classPath = undefined;
				}
			}
		}

		AbstractFileReader._pathToClassNameCache[`${className},${isFragment}`] = classPath;

		return classPath;
	}

	abstract convertClassNameToFSPath(
		className: string,
		isController?: boolean,
		isFragment?: boolean,
		isView?: boolean,
		isFolder?: boolean
	): string | undefined;

	getAllManifests() {
		return this._manifests;
	}

	rereadAllManifests() {
		this._manifests = [];
		this._fetchAllWorkspaceManifests();
	}

	getManifestForClass(className = "") {
		return this._manifests.find(UIManifest => className.startsWith(UIManifest.componentName + "."));
	}

	protected _fetchAllWorkspaceManifests() {
		const manifests = this.getManifestFSPathsInWorkspaceFolder();
		for (const manifest of manifests) {
			try {
				const UI5Manifest = fs.readFileSync(manifest.fsPath, "utf8");
				const parsedManifest: any = JSON.parse(UI5Manifest);
				const manifestFsPath: string = manifest.fsPath.replace(`${fileSeparator}manifest.json`, "");
				const UIManifest = {
					componentName: parsedManifest["sap.app"]?.id || "",
					fsPath: manifestFsPath,
					content: parsedManifest,
					contentString: UI5Manifest,
					getCache: function <Type>(cacheName: string) {
						return <Type>(this as any)._cache[cacheName];
					},
					setCache: function <Type>(cacheName: string, cacheValue: Type) {
						(this as any)._cache[cacheName] = cacheValue;
					}
				};
				(UIManifest as any)._cache = {};

				this._manifests.push(UIManifest);
			} catch (error) {
				console.error(`Couldn't read manifest.json. Error message: ${(<Error>error).message || ""}`);
				throw error;
			}
		}
	}

	getManifestFSPathsInWorkspaceFolder() {
		const timeStart = new Date().getTime();
		const manifestPaths = this._readFilesInWorkspace("**/manifest.json");
		const timeEnd = new Date().getTime();
		const timeSpent = timeEnd - timeStart;
		if (timeSpent > 5000 || manifestPaths.length > 30) {
			console.info(
				`Reading manifests took ${timeSpent / 100}s and ${
					manifestPaths.length
				} manifests found. Please make sure that "ui5.plugin.excludeFolderPattern" preference is configured correctly.`
			);
		}

		const manifests: IManifestPaths[] = manifestPaths.map(manifestPath => {
			return {
				fsPath: manifestPath.replace(/\//g, fileSeparator)
			};
		});
		return manifests;
	}

	protected _readFilesInWorkspace(path: string) {
		return AbstractFileReader.readFilesInWorkspace(this._parser.workspaceFolder, path, this._configHandler);
	}

	readFiles(path: string) {
		return AbstractFileReader.readFilesInWorkspace(this._parser.workspaceFolder, path, this._configHandler);
	}

	abstract getClassNameFromView(controllerClassName: string, controlId: string): string | undefined;

	getViewForController(controllerName: string): IView | undefined {
		let view = ParserPool.getAllViews().find(view => view.controllerName === controllerName);
		if (!view) {
			const swappedControllerName = this._swapControllerNameIfItWasReplacedInManifest(controllerName);
			if (swappedControllerName !== controllerName) {
				view = this.getViewForController(swappedControllerName);
			}
		}
		return view;
	}

	protected _swapControllerNameIfItWasReplacedInManifest(controllerName: string) {
		const extensions = this.getManifestExtensionsForClass(controllerName);
		const controllerReplacements = extensions && extensions["sap.ui.controllerReplacements"];

		if (controllerReplacements) {
			const replacementKey = Object.keys(controllerReplacements).find(replacementKey => {
				return controllerReplacements[replacementKey] === controllerName;
			});
			if (replacementKey) {
				controllerName = replacementKey;
			}
		}

		return controllerName;
	}

	abstract getFragmentsMentionedInClass(className: string): IFragment[];

	getFragmentsInXMLFile(XMLFile: IXMLFile) {
		const fragmentsInFragment: IFragment[] = [];
		const fragments = XMLFile.fragments;
		fragments.forEach(fragment => {
			fragmentsInFragment.push(...this.getFragmentsInXMLFile(fragment));
		});

		return fragments.concat(fragmentsInFragment);
	}

	getFirstFragmentForClass(className: string): IFragment | undefined {
		const fragment = this.getFragmentsMentionedInClass(className)[0];

		return fragment;
	}

	getViewText(controllerName: string) {
		return this.getViewForController(controllerName)?.content;
	}

	protected _getClassOfControlIdFromView(XMLFile: IXMLFile & IIdClassMap, controlId: string) {
		if (!XMLFile.idClassMap[controlId]) {
			let controlClass = "";

			const allIds = this._parser.xmlParser.getAllIDsInCurrentView(XMLFile);
			const id = allIds.find(idData => idData.id === controlId);
			controlClass = id?.className || "";
			if (controlClass) {
				XMLFile.idClassMap[controlId] = controlClass;
			}
		}

		return XMLFile.idClassMap[controlId];
	}

	readFragments() {
		this._readAllFragmentsAndSaveInCache();
	}

	readViews() {
		this._readAllViewsAndSaveInCache();
	}

	readI18n() {
		this._parser.resourceModelData.readTexts();
	}

	abstract readCustomClasses(): void;

	protected _readAllViewsAndSaveInCache() {
		const viewPaths = this._readFilesInWorkspace("**/*.view.xml");
		viewPaths.forEach(viewPath => {
			const viewContent = fs.readFileSync(viewPath, "utf8");
			const viewFSPath = viewPath.replace(/\//g, fileSeparator);
			this.setNewViewContentToCache(viewContent, viewFSPath);
		});
	}

	protected _readAllFragmentsAndSaveInCache() {
		const fragmentPaths = this._readFilesInWorkspace("**/*.fragment.xml");
		const fragmentData = fragmentPaths.map(path => {
			const fragmentFSPath = path.replace(/\//g, fileSeparator);
			return { fragmentFSPath, content: fs.readFileSync(fragmentFSPath, "utf8") };
		});
		fragmentData.forEach(fragmentData => {
			this.setNewFragmentContentToCache(fragmentData.content, fragmentData.fragmentFSPath);
		});
		this.reloadFragmentReferences();
	}

	abstract getAllJSClassNamesFromProject(): string[];

	getControllerNameFromView(viewContent: string) {
		const controllerNameResult = /(?<=controllerName=").*?(?=")/.exec(viewContent);
		const controllerName = controllerNameResult ? controllerNameResult[0] : undefined;

		return controllerName;
	}

	getResponsibleClassForXMLDocument(document: TextDocument) {
		const XMLDocument = this._parser.textDocumentTransformer.toXMLFile(document);
		if (XMLDocument) {
			return this.getResponsibleClassNameForViewOrFragment(XMLDocument);
		}
	}

	//TODO: compare it to similar method?
	getResponsibleClassNameForViewOrFragment(viewOrFragment: IXMLFile) {
		const isFragment = viewOrFragment.fsPath.endsWith(".fragment.xml");
		const isView = viewOrFragment.fsPath.endsWith(".view.xml");
		let responsibleClassName: string | undefined;

		if (isView) {
			responsibleClassName = this.getControllerNameFromView(viewOrFragment.content);
		} else if (isFragment) {
			const fragmentName = this.getClassNameFromPath(viewOrFragment.fsPath);
			const responsibleView = ParserPool.getAllViews().find(view => {
				return !!view.fragments.find(fragmentFromView => fragmentFromView.name === fragmentName);
			});

			if (responsibleView) {
				responsibleClassName = this.getControllerNameFromView(responsibleView.content);
			} else {
				responsibleClassName = this._getResponsibleClassNameForFragmentFromCustomUIClasses(viewOrFragment);
			}

			if (!responsibleClassName) {
				const responsibleFragment = ParserPool.getAllFragments().find(fragment => {
					return fragment.fragments.find(fragment => fragment.fsPath === viewOrFragment.fsPath);
				});
				if (responsibleFragment) {
					responsibleClassName = this.getResponsibleClassNameForViewOrFragment(responsibleFragment);
				}
			}

			if (!responsibleClassName) {
				responsibleClassName = this._getResponsibleClassNameForFragmentFromManifestExtensions(viewOrFragment);
			}
		}

		return responsibleClassName;
	}

	getManifestExtensionsForClass(className: string): any | undefined {
		const manifest = ParserPool.getManifestForClass(className);
		return manifest?.content["sap.ui5"]?.extends?.extensions;
	}

	protected _getResponsibleClassNameForFragmentFromManifestExtensions(viewOrFragment: IXMLFile) {
		let responsibleClassName: string | undefined;
		const fragmentName = this.getClassNameFromPath(viewOrFragment.fsPath);
		if (fragmentName) {
			const extensions = this.getManifestExtensionsForClass(fragmentName);
			const viewExtensions = extensions && extensions["sap.ui.viewExtensions"];
			if (viewExtensions) {
				const viewName = Object.keys(viewExtensions).find(viewName => {
					const viewExtensionPoints = viewExtensions[viewName];
					if (viewExtensionPoints) {
						return Object.keys(viewExtensionPoints).find(extensionPointName => {
							return viewExtensionPoints[extensionPointName].fragmentName === fragmentName;
						});
					}
					return false;
				});

				if (viewName) {
					const view = ParserPool.getAllViews().find(view => {
						const currentViewName = this.getClassNameFromPath(view.fsPath);
						if (currentViewName) {
							return currentViewName === viewName;
						}
						return false;
					});
					if (view) {
						responsibleClassName = this.getControllerNameFromView(view.content);

						if (responsibleClassName) {
							responsibleClassName = this._swapResponsibleControllerIfItIsExtendedInManifest(
								responsibleClassName,
								fragmentName
							);
						}
					}
				}
			}
		}

		return responsibleClassName;
	}

	protected _swapResponsibleControllerIfItIsExtendedInManifest(controllerName: string, sourceClassName: string) {
		const extensions = this.getManifestExtensionsForClass(sourceClassName);
		const controllerReplacements = extensions && extensions["sap.ui.controllerReplacements"];

		if (controllerReplacements) {
			const replacementKey = Object.keys(controllerReplacements).find(replacementKey => {
				return replacementKey === controllerName;
			});
			if (replacementKey) {
				controllerName = controllerReplacements[replacementKey];
			}
		}

		return controllerName;
	}

	protected _getResponsibleClassNameForFragmentFromCustomUIClasses(viewOrFragment: IXMLFile) {
		const allUIClasses = ParserPool.getAllCustomUIClasses();
		const fragmentName = this.getClassNameFromPath(viewOrFragment.fsPath);
		const responsibleClass = allUIClasses.find(UIClass => {
			return UIClass.classText.includes(`${fragmentName}`);
		});

		return responsibleClass?.className;
	}

	getFragmentsFromXMLDocumentText(documentText: string) {
		const fragments: IFragment[] = [];
		const fragmentTags = this._getFragmentTags(documentText);
		fragmentTags.forEach(fragmentTag => {
			const fragmentName = this._getFragmentNameFromTag(fragmentTag);
			if (fragmentName) {
				const fragmentPath = this.getClassFSPathFromClassName(fragmentName, true);
				const fragment = ParserPool.getFragment(fragmentName);
				if (fragment && fragmentPath) {
					fragments.push(fragment);
				}
			}
		});

		return fragments;
	}

	getFragment(fragmentName: string): IFragment | undefined {
		return this._fragmentCache[fragmentName];
	}

	getAllFragments() {
		return Object.keys(this._fragmentCache).map(key => this._fragmentCache[key]);
	}

	protected _getFragmentNameFromTag(fragmentTag: string) {
		let fragmentName;
		const fragmentNameResult = /(?<=fragmentName=").*?(?=")/.exec(fragmentTag);
		if (fragmentNameResult) {
			fragmentName = fragmentNameResult[0];
		}
		return fragmentName;
	}

	protected _getFragmentTags(documentText: string) {
		return documentText.match(/<.*?:Fragment\s(.|\s)*?\/?>/g) || [];
	}

	getClassNameFromPath(fsPath: string) {
		if (AbstractFileReader._classNameToPathCache[fsPath]) {
			return AbstractFileReader._classNameToPathCache[fsPath];
		}

		fsPath = toNative(fsPath.replace(/\//g, fileSeparator));
		let className: string | undefined;
		const manifests = ParserPool.getAllManifests();
		// TODO: this
		const currentManifest = manifests.find(manifest =>
			fsPath.toLowerCase().startsWith(manifest.fsPath.toLowerCase())
		);
		if (currentManifest) {
			const manifestPathLength = currentManifest.fsPath.length;
			className =
				currentManifest.componentName +
				fsPath
					.substring(manifestPathLength, fsPath.length)
					// .replace(currentManifest.fsPath.toLowerCase(), currentManifest.componentName)
					.replace(/\.view\.xml$/, "")
					.replace(/\.fragment\.xml$/, "")
					.replace(/\.xml$/, "")
					.replace(/\.controller\.js$/, "")
					.replace(/\.js$/, "")
					.replace(/\.controller\.ts$/, "")
					.replace(/\.ts$/, "")
					.replace(new RegExp(`${escapedFileSeparator}`, "g"), ".");
		}

		AbstractFileReader._classNameToPathCache[fsPath] = className;

		return className;
	}

	getCache(cacheType: IFileReader.CacheType) {
		let cache;
		const cachePath =
			cacheType === IFileReader.CacheType.Metadata
				? this._getMetadataCachePath()
				: cacheType === IFileReader.CacheType.APIIndex
				? this._getAPIIndexCachePath()
				: cacheType === IFileReader.CacheType.Icons
				? this._getIconCachePath()
				: null;

		if (cachePath && fs.existsSync(cachePath)) {
			const fileText = fs.readFileSync(cachePath, "utf8");
			try {
				cache = JSON.parse(fileText);
			} catch (error) {
				console.log(error);
			}
		}

		return cache;
	}

	setCache(cacheType: IFileReader.CacheType, cache: string) {
		const cachePath =
			cacheType === IFileReader.CacheType.Metadata
				? this._getMetadataCachePath()
				: cacheType === IFileReader.CacheType.APIIndex
				? this._getAPIIndexCachePath()
				: cacheType === IFileReader.CacheType.Icons
				? this._getIconCachePath()
				: null;

		if (cachePath) {
			if (!fs.existsSync(cachePath)) {
				this._ensureThatPluginCacheFolderExists();
			}

			fs.writeFileSync(cachePath, cache, "utf8");
		}
	}

	clearCache() {
		if (this.globalStoragePath) {
			if (fs.existsSync(this.globalStoragePath)) {
				const directory = this.globalStoragePath;
				fs.readdir(directory, (err, files) => {
					for (const file of files) {
						fs.unlinkSync(path.join(directory, file));
					}
				});
			}
		}
	}

	protected _ensureThatPluginCacheFolderExists() {
		if (this.globalStoragePath) {
			if (!fs.existsSync(this.globalStoragePath)) {
				fs.mkdirSync(this.globalStoragePath, {
					recursive: true
				});
			}
		}
	}

	protected _getMetadataCachePath() {
		return `${this.globalStoragePath}${fileSeparator}cache_${this._UI5Version}.json`;
	}

	protected _getAPIIndexCachePath() {
		return `${this.globalStoragePath}${fileSeparator}cache_appindex_${this._UI5Version}.json`;
	}

	protected _getIconCachePath() {
		return `${this.globalStoragePath}${fileSeparator}cache_icons_${this._UI5Version}.json`;
	}

	getResourceModelFiles() {
		const manifests = this.getAllManifests();
		return manifests.map(manifest => {
			return {
				content: this.readResourceModelFile(manifest),
				componentName: manifest.componentName
			};
		});
	}

	readResourceModelFile(manifest: IUIManifest) {
		let resourceModelFileContent = "";
		const resourceModelFilePath = this.getResourceModelUriForManifest(manifest);
		try {
			resourceModelFileContent = fs.readFileSync(resourceModelFilePath, "utf8");
		} catch {
			resourceModelFileContent = "";
		}

		return resourceModelFileContent;
	}

	getResourceModelUriForManifest(manifest: IUIManifest) {
		const i18nRelativePath =
			typeof manifest.content["sap.app"]?.i18n === "string"
				? manifest.content["sap.app"]?.i18n
				: `i18n${fileSeparator}i18n.properties`;
		const i18nPath = i18nRelativePath.replace(/\//g, fileSeparator);
		return `${manifest.fsPath}${fileSeparator}${i18nPath}`;
	}

	removeFromCache(fsPath: string) {
		return this._removeViewFromCache(fsPath) || this._removeFragmentFromCache(fsPath);
	}

	protected _removeViewFromCache(fsPath: string) {
		const className = this.getClassNameFromPath(fsPath);
		if (fsPath.endsWith(".view.xml")) {
			if (className) {
				this._viewCache[className].controllerName = "";
				this._viewCache[className].content = "";
				this._viewCache[className].idClassMap = {};
				this._viewCache[className].XMLParserData = undefined;
				this._viewCache[className].fragments = [];
				this._viewCache[className].fsPath = "";
				delete this._viewCache[className];
				return true;
			}
		}
		return false;
	}

	protected _removeFragmentFromCache(fsPath: string) {
		const className = this.getClassNameFromPath(fsPath);
		if (fsPath.endsWith(".fragment.xml") && className) {
			if (this._fragmentCache[className]) {
				this._fragmentCache[className].content = "";
				this._fragmentCache[className].idClassMap = {};
				this._fragmentCache[className].XMLParserData = undefined;
				this._fragmentCache[className].fragments = [];
				this._fragmentCache[className].fsPath = "";
				delete this._fragmentCache[className];
				return true;
			}
		}
		return false;
	}

	getXMLFile(className: string, fileType?: string) {
		let xmlFile: IXMLFile | undefined;
		if (fileType === "fragment" || !fileType) {
			xmlFile = ParserPool.getFragment(className);
		}

		if (!xmlFile && (fileType === "view" || !fileType)) {
			const allViews = ParserPool.getAllViews();
			xmlFile =
				allViews.find(view => view.name === className) ||
				allViews.find(view => view.controllerName === className);
		}

		return xmlFile;
	}

	replaceViewNames(oldName: string, newName: string) {
		const XMLFile = this.getXMLFile(oldName, "view");
		const newFSPath = this.convertClassNameToFSPath(newName, false, false, true);
		if (XMLFile && newFSPath) {
			XMLFile.fsPath = newFSPath;
			XMLFile.name = newName;
		}
	}

	removeView(viewName: string) {
		delete this._viewCache[viewName];
	}

	replaceFragmentNames(oldName: string, newName: string) {
		const fragment = this._fragmentCache[oldName];
		const newFSPath = this.convertClassNameToFSPath(newName, false, true);
		if (fragment && newFSPath) {
			fragment.fsPath = newFSPath;
			fragment.name = newName;
			this._fragmentCache[newName] = this._fragmentCache[oldName];
			delete this._fragmentCache[oldName];
		}
	}

	static readFilesInWorkspace(wsFolder: WorkspaceFolder, path: string, configHandler: IParserConfigHandler) {
		const wsFolderFSPath = wsFolder.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
		const exclusions: string[] = configHandler.getExcludeFolderPatterns();
		const exclusionPaths = exclusions.map(excludeString => {
			return `${wsFolderFSPath}/${excludeString}`;
		});
		const filePaths = glob
			.sync(`${wsFolderFSPath}/${path}`, {
				ignore: exclusionPaths
			})
			.map(filePath => toNative(filePath));

		return filePaths;
	}
}

const toNativeCache: Record<string, string> = {};
export function toNative(fsPath: string) {
	if (toNativeCache[fsPath]) {
		return toNativeCache[fsPath];
	}

	try {
		const realPath = fs.realpathSync.native(fsPath);
		toNativeCache[fsPath] = realPath;

		return realPath;
	} catch (error) {
		return fsPath;
	}
}
