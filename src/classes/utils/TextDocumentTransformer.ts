import { FileReader } from "./FileReader";
import { XMLParser } from "./XMLParser";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";
import { CustomUIClass } from "../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { TextDocument } from "../UI5Classes/abstraction/TextDocument";

export class TextDocumentTransformer {
	static toXMLFile(document: TextDocument, forceRefresh = false) {
		const className = FileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const xmlType = document.fileName.endsWith(".fragment.xml") ? "fragment" : "view";
			const XMLFile = FileReader.getXMLFile(className, xmlType);
			if (XMLFile && !XMLFile.XMLParserData) {
				XMLParser.fillXMLParsedData(XMLFile);
			}
			if (XMLFile && (XMLFile.content.length !== document.getText().length || forceRefresh)) {
				if (xmlType === "view") {
					FileReader.setNewViewContentToCache(document.getText(), document.fileName);
				} else if (xmlType === "fragment") {
					FileReader.setNewFragmentContentToCache(document.getText(), document.fileName);
				}
			}

			return XMLFile;
		}
	}

	static toUIClass(document: TextDocument) {
		const className = FileReader.getClassNameFromPath(document.fileName);
		return className ? UIClassFactory.getUIClass(className) : undefined;
	}

	static toCustomUIClass(document: TextDocument) {
		let customUIClass: CustomUIClass | undefined;
		const className = FileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = UIClassFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass) {
				customUIClass = UIClass;
			}
		}
		return customUIClass;
	}
}