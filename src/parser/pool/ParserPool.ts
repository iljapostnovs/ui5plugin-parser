import { IUIClassMap } from "../../classes/parsing/ui5class/factory/IClassFactory";
import { IFileReader } from "../../classes/parsing/util/filereader/IFileReader";
import { IUI5Parser } from "../abstraction/IUI5Parser";

export default class ParserPool {
	private static readonly _parsers: IUI5Parser[] = [];
	static register(parser: IUI5Parser) {
		this._parsers.push(parser);
	}

	static getParserForCustomClass<Parser extends IUI5Parser = IUI5Parser>(className: string) {
		return this._parsers.find(parser => {
			return !!parser.fileReader.getManifestForClass(className);
		}) as Parser | undefined;
	}

	static getParserForFile<Parser extends IUI5Parser = IUI5Parser>(fsPath: string) {
		return this._parsers.find(parser => {
			return !!parser.fileReader.getClassNameFromPath(fsPath);
		}) as Parser | undefined;
	}

	static getAllParsers() {
		return this._parsers;
	}

	static getAllParsersExcept(except: IUI5Parser) {
		return this.getAllParsers().filter(parser => parser !== except);
	}

	static getAllFileReaders() {
		return this._parsers.map(parser => parser.fileReader);
	}

	static getAllFileReadersExcept(except: IFileReader) {
		return this.getAllFileReaders().filter(fileReader => fileReader !== except);
	}

	static getAllFragments() {
		return this.getAllFileReaders().flatMap(fileReader => fileReader.getAllFragments());
	}

	static getFragment(fragmentName: string) {
		const fileReaders = ParserPool.getAllFileReaders();
		const fileReader = fileReaders.find(fileReader => fileReader.getFragment(fragmentName));

		return fileReader?.getFragment(fragmentName);
	}

	static getAllViews() {
		return this.getAllFileReaders().flatMap(fileReader => fileReader.getAllViews());
	}

	static getAllManifests() {
		return this.getAllFileReaders().flatMap(fileReader => fileReader.getAllManifests());
	}

	static getAllExistentUIClasses(): IUIClassMap {
		return this.getAllParsers().reduce((UIClasses, parser) => {
			const UIClassesFromCurrentParser = parser.classFactory.getAllExistentUIClasses();

			UIClasses = {
				...UIClasses,
				...UIClassesFromCurrentParser
			};
			return UIClasses;
		}, {});
	}

	static clearCache() {
		this._parsers.forEach(parser => {
			parser.fileReader.clearCache();
		});
	}
}
