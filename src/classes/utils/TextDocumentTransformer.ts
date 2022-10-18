import { XMLParser } from "./XMLParser";
import { TextDocument } from "../UI5Classes/abstraction/TextDocument";
import { UI5Parser } from "../../UI5Parser";
import { AbstractUI5Parser } from "../../IUI5Parser";
import { AbstractCustomClass } from "../UI5Classes/UI5Parser/UIClass/AbstractCustomClass";

export class TextDocumentTransformer {
	static toXMLFile(document: TextDocument, forceRefresh = false) {
		const className = AbstractUI5Parser.getInstance(UI5Parser).fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const xmlType = document.fileName.endsWith(".fragment.xml") ? "fragment" : "view";
			const XMLFile = AbstractUI5Parser.getInstance(UI5Parser).fileReader.getXMLFile(className, xmlType);
			if (XMLFile && !XMLFile.XMLParserData) {
				XMLParser.fillXMLParsedData(XMLFile);
			}
			if (XMLFile && (XMLFile.content.length !== document.getText().length || forceRefresh)) {
				if (xmlType === "view") {
					AbstractUI5Parser.getInstance(UI5Parser).fileReader.setNewViewContentToCache(
						document.getText(),
						document.fileName
					);
				} else if (xmlType === "fragment") {
					AbstractUI5Parser.getInstance(UI5Parser).fileReader.setNewFragmentContentToCache(
						document.getText(),
						document.fileName
					);
				}
			}

			return XMLFile;
		}
	}

	static toUIClass(document: TextDocument) {
		const className = AbstractUI5Parser.getInstance(UI5Parser).fileReader.getClassNameFromPath(document.fileName);
		return className ? AbstractUI5Parser.getInstance(UI5Parser).classFactory.getUIClass(className) : undefined;
	}

	static toCustomUIClass(document: TextDocument) {
		let customUIClass: AbstractCustomClass | undefined;
		const className = AbstractUI5Parser.getInstance(UI5Parser).fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = AbstractUI5Parser.getInstance(UI5Parser).classFactory.getUIClass(className);
			if (UIClass instanceof AbstractCustomClass) {
				customUIClass = UIClass;
			}
		}
		return customUIClass;
	}
}
