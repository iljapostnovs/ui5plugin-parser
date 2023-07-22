import * as path from "path";
import { UI5JSParser } from "../../../../parser/UI5JSParser";
import ParserPool from "../../../../parser/pool/ParserPool";
import { CustomJSClass } from "../../ui5class/js/CustomJSClass";
import { AbstractFileReader } from "./AbstractFileReader";
import { IFragment } from "./IFileReader";

export class JSFileReader extends AbstractFileReader<CustomJSClass, UI5JSParser> {
	setParser(parser: UI5JSParser) {
		this._parser = parser;
	}

	convertClassNameToFSPath(
		className: string,
		isController = false,
		isFragment = false,
		isView = false,
		isFolder = false
	) {
		const parser = ParserPool.getParserForCustomClass(className);
		if (parser !== this._parser) {
			return parser?.fileReader.convertClassNameToFSPath(className, isController, isFragment, isView, isFolder);
		}

		let FSPath;
		let extension = ".js";
		const manifest = ParserPool.getManifestForClass(className);
		if (manifest) {
			if (isController) {
				extension = ".controller.js";
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
			if (UIClass instanceof CustomJSClass) {
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

		if (UIClass instanceof CustomJSClass) {
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
		this._readAllJSFiles();
	}

	protected _readAllJSFiles() {
		const classPaths = this._readFilesInWorkspace("**/*.js");
		const classNames = classPaths.map(path => this.getClassNameFromPath(path));
		classNames.forEach(className => {
			if (className) {
				try {
					this._classFactory.getUIClass(className);
				} catch (error) {
					console.error(`Error parsing ${className}: ${(<Error>error).message}`);
				}
			}
		});
	}

	getAllJSClassNamesFromProject() {
		let classNames: string[] = [];
		const classPaths = this._readFilesInWorkspace("**/*.js");
		classNames = classPaths.reduce((accumulator: string[], viewPath) => {
			const path = this.getClassNameFromPath(viewPath);
			if (path) {
				accumulator.push(path);
			}

			return accumulator;
		}, []);

		return classNames;
	}

	reEnrichAllCustomClasses() {
		const UIClasses = this._classFactory.getAllCustomUIClasses();
		UIClasses.forEach(UIClass => {
			if (UIClass instanceof CustomJSClass) {
				UIClass.relatedViewsAndFragments = undefined;
				this._classFactory.enrichTypesInCustomClass(UIClass);
			}
		});
	}
}
