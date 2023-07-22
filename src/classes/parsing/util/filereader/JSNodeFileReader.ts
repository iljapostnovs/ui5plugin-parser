import path = require("path");
import ParserPool from "../../../../parser/pool/ParserPool";
import { JSFileReader } from "./JSFileReader";

export class JSNodeFileReader extends JSFileReader {
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
				.trim()}-dbg${extension}`;
		}

		return FSPath;
	}

	protected _readAllJSFiles() {
		const classPaths = this._readFilesInWorkspace("**/*-dbg.js");
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
		const classPaths = this._readFilesInWorkspace("**/*-dbg.js");
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
