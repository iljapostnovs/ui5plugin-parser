import { IUI5Parser } from "../../IUI5Parser";
import { TextDocument } from "../parsing/abstraction/TextDocument";
import { AbstractCustomClass } from "../parsing/ui5class/AbstractCustomClass";

export class TextDocumentTransformer {
	private readonly _parser: IUI5Parser;

	constructor(parser: IUI5Parser) {
		this._parser = parser;
	}

	toXMLFile(document: TextDocument, forceRefresh = false) {
		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const xmlType = document.fileName.endsWith(".fragment.xml") ? "fragment" : "view";
			const XMLFile = this._parser.fileReader.getXMLFile(className, xmlType);
			if (XMLFile && !XMLFile.XMLParserData) {
				this._parser.xmlParser.fillXMLParsedData(XMLFile);
			}
			if (XMLFile && (XMLFile.content.length !== document.getText().length || forceRefresh)) {
				if (xmlType === "view") {
					this._parser.fileReader.setNewViewContentToCache(document.getText(), document.fileName);
				} else if (xmlType === "fragment") {
					this._parser.fileReader.setNewFragmentContentToCache(document.getText(), document.fileName);
				}
			}

			return XMLFile;
		}
	}

	toUIClass(document: TextDocument) {
		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		return className ? this._parser.classFactory.getUIClass(className) : undefined;
	}

	toCustomUIClass(document: TextDocument) {
		let customUIClass: AbstractCustomClass | undefined;
		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof AbstractCustomClass) {
				customUIClass = UIClass;
			}
		}
		return customUIClass;
	}
}
