import { AbstractCustomClass } from "../../classes/parsing/ui5class/AbstractCustomClass";
import { IUIClassMap } from "../../classes/parsing/ui5class/factory/IClassFactory";
import { IFileReader } from "../../classes/parsing/util/filereader/IFileReader";
import { IUI5Parser } from "../abstraction/IUI5Parser";

export default class ParserPool {
	private static readonly _parsers: IUI5Parser[] = [];
	static register(parser: IUI5Parser) {
		this._parsers.push(parser);
	}

	static deregister(parserToDeregister: IUI5Parser) {
		const parserRegistered = this._parsers.some(cachedParser => cachedParser === parserToDeregister);
		if (parserRegistered) {
			const indexOfParser = this._parsers.indexOf(parserToDeregister);
			this._parsers.splice(indexOfParser, 1);
		}
	}

	static getParserForCustomClass<Parser extends IUI5Parser = IUI5Parser>(className: string) {
		const manifests = this.getAllManifests();
		const manifest = manifests.find(manifest => className.startsWith(manifest.componentName));
		return (
			manifest &&
			(this._parsers.find(parser => {
				return parser.fileReader.getAllManifests().includes(manifest);
			}) as Parser | undefined)
		);
	}

	static getParserForFile<Parser extends IUI5Parser = IUI5Parser>(fsPath: string) {
		const fsPathLower = fsPath.toLowerCase();
		const manifests = this.getAllManifests();
		const manifest = manifests.find(manifest => fsPathLower.startsWith(manifest.fsPath.toLowerCase()));
		return (
			manifest &&
			(this._parsers.find(parser => {
				return parser.fileReader.getAllManifests().includes(manifest);
			}) as Parser | undefined)
		);
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
		const manifests = this.getAllFileReaders().flatMap(fileReader => fileReader.getAllManifests());
		const sortedByNameManifests = manifests.sort((firstManifest, secondManifest) => {
			return secondManifest.componentName.length - firstManifest.componentName.length;
		});

		return sortedByNameManifests;
	}

	static getManifestForClass(className = "") {
		const manifests = this.getAllManifests();
		const manifest = manifests.find(manifest => className.startsWith(manifest.componentName));

		return manifest;
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

	static getAllCustomUIClasses() {
		const allUIClasses = this.getAllExistentUIClasses();

		return Object.keys(allUIClasses)
			.filter(UIClassName => {
				return allUIClasses[UIClassName] instanceof AbstractCustomClass;
			})
			.map(UIClassName => allUIClasses[UIClassName] as AbstractCustomClass);
	}

	static clearCache() {
		this._parsers.forEach(parser => {
			parser.fileReader.clearCache();
		});
	}
}
