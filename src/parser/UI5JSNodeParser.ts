import { CustomJSClass } from "../classes/parsing/ui5class/js/CustomJSClass";
import { IFileReader } from "../classes/parsing/util/filereader/IFileReader";
import { JSNodeFileReader } from "../classes/parsing/util/filereader/JSNodeFileReader";
import { UI5JSParser } from "./UI5JSParser";
import { IConstructorParams } from "./abstraction/IUI5Parser";

export class UI5JSNodeParser extends UI5JSParser {
	readonly fileReader: IFileReader;
	constructor(params: IConstructorParams<CustomJSClass>, packagePath?: string) {
		super(params, packagePath);

		this.fileReader = new JSNodeFileReader(this.configHandler, this.classFactory);
		this.fileReader.setParser(this);
	}
}
