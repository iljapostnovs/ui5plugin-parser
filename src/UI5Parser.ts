import { IFileReader, ISyntaxAnalyser } from ".";
import { IParserConfigHandler } from "./classes/config/IParserConfigHandler";
import { PackageParserConfigHandler } from "./classes/config/PackageParserConfigHandler";
import { IUIClassFactory } from "./classes/UI5Classes/interfaces/IUIClassFactory";
import { AcornSyntaxAnalyzer } from "./classes/UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { CustomUIClass } from "./classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "./classes/UI5Classes/UIClassFactory";
import { FileReader } from "./classes/utils/FileReader";
import { AbstractUI5Parser, IConstructorParams } from "./IUI5Parser";

export class UI5Parser extends AbstractUI5Parser<CustomUIClass> {
	readonly configHandler: IParserConfigHandler;
	readonly classFactory: IUIClassFactory<CustomUIClass>;
	readonly fileReader: IFileReader;
	readonly syntaxAnalyser: ISyntaxAnalyser;
	constructor(params?: IConstructorParams<CustomUIClass>) {
		super();
		this.syntaxAnalyser = new AcornSyntaxAnalyzer();
		this.classFactory = params?.classFactory || new UIClassFactory(this.syntaxAnalyser);
		this.configHandler = params?.configHandler || new PackageParserConfigHandler();
		this.fileReader = params?.fileReader || new FileReader(this.configHandler, this.classFactory);

		return this;
	}
}
