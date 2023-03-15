import * as glob from "glob";
import * as path from "path";
import ParserPool from "../../../../parser/pool/ParserPool";
import { UI5TSParser } from "../../../../parser/UI5TSParser";
import { CustomTSClass } from "../../ui5class/ts/CustomTSClass";
import { CustomTSObject } from "../../ui5class/ts/CustomTSObject";
import { AbstractFileReader } from "./AbstractFileReader";
import { IFragment } from "./IFileReader";
const escapedFileSeparator = "\\" + path.sep;

export class TSFileReader extends AbstractFileReader<CustomTSClass | CustomTSObject, UI5TSParser> {
	convertClassNameToFSPath(
		className: string,
		isController = false,
		isFragment = false,
		isView = false,
		isFolder = false
	) {
		let FSPath;
		let extension = ".ts";
		const manifest = this.getManifestForClass(className);
		if (manifest) {
			if (isController) {
				extension = ".controller.ts";
			} else if (isFragment) {
				extension = ".fragment.xml";
			} else if (isView) {
				extension = ".view.xml";
			} else if (isFolder) {
				extension = "";
			}

			const separator = path.sep;
			FSPath = `${manifest.fsPath}${className
				.replace(manifest.componentName, "")
				.replace(/\./g, separator)
				.trim()}${extension}`;
		}

		return FSPath;
	}

	protected _readFilesInWorkspace(path: string) {
		const wsFolderFSPath = this._parser.workspaceFolder.fsPath.replace(
			new RegExp(`${escapedFileSeparator}`, "g"),
			"/"
		);
		const exclusions: string[] = this._configHandler.getExcludeFolderPatterns();
		exclusions.push("**/*.d.ts");
		exclusions.push("**/src-gen/**");
		exclusions.push("**/webapp/**");
		const exclusionPaths = exclusions.map(excludeString => {
			return `${wsFolderFSPath}/${excludeString}`;
		});
		const filePaths = glob.sync(`${wsFolderFSPath}/${path}`, {
			ignore: exclusionPaths
		});

		return filePaths;
	}

	//TODO: Refactor this
	getClassNameFromView(controllerClassName: string, controlId: string) {
		let className: string | undefined;
		const view = this.getViewForController(controllerClassName);
		if (view) {
			className = this._getClassOfControlIdFromView(view, controlId);
			if (!className) {
				view.fragments.find(fragment => {
					className = this._getClassOfControlIdFromView(fragment, controlId);
					return !!className;
				});
			}
		}

		if (!className) {
			const UIClass = this._classFactory.getUIClass(controllerClassName);
			if (UIClass instanceof CustomTSClass) {
				const fragmentsAndViews = this._classFactory.getViewsAndFragmentsOfControlHierarchically(UIClass);
				const fragmentAndViewArray = [...fragmentsAndViews.views, ...fragmentsAndViews.fragments];
				fragmentAndViewArray.find(view => {
					className = this._getClassOfControlIdFromView(view, controlId);
					return !!className;
				});
			}
		}

		return className;
	}

	getFragmentsMentionedInClass(className: string) {
		let fragments: IFragment[] = [];
		const UIClass = this._classFactory.getUIClass(className);

		if (UIClass instanceof CustomTSClass) {
			fragments = ParserPool.getAllFragments().filter(fragment => {
				return UIClass.classText.indexOf(`"${fragment.name}"`) > -1;
			});

			const fragmentsInFragment: IFragment[] = [];
			fragments.forEach(fragment => {
				fragmentsInFragment.push(...this.getFragmentsInXMLFile(fragment));
			});

			fragments.push(...fragmentsInFragment);
		}

		return fragments;
	}

	readCustomClasses() {
		//not needed, handled by ts-morph
	}

	getAllJSClassNamesFromProject() {
		let classNames: string[] = [];
		const classPaths = this._readFilesInWorkspace("**/*.ts");
		classNames = classPaths.reduce((accumulator: string[], viewPath) => {
			const path = this.getClassNameFromPath(viewPath);
			if (path) {
				accumulator.push(path);
			}

			return accumulator;
		}, []);

		return classNames;
	}
}
