import { XMLParser } from "./XMLParser";
import { CustomUIClass } from "../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { TextDocument } from "../UI5Classes/abstraction/TextDocument";
import { UI5Parser } from "../../UI5Parser";

export class TextDocumentTransformer {
	static toXMLFile(document: TextDocument, forceRefresh = false) {
		const className = UI5Parser.getInstance().fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const xmlType = document.fileName.endsWith(".fragment.xml") ? "fragment" : "view";
			const XMLFile = UI5Parser.getInstance().fileReader.getXMLFile(className, xmlType);
			if (XMLFile && !XMLFile.XMLParserData) {
				XMLParser.fillXMLParsedData(XMLFile);
			}
			if (XMLFile && (XMLFile.content.length !== document.getText().length || forceRefresh)) {
				if (xmlType === "view") {
					UI5Parser.getInstance().fileReader.setNewViewContentToCache(document.getText(), document.fileName);
				} else if (xmlType === "fragment") {
					UI5Parser.getInstance().fileReader.setNewFragmentContentToCache(document.getText(), document.fileName);
				}
			}

			return XMLFile;
		}
	}

	static toUIClass(document: TextDocument) {
		const className = UI5Parser.getInstance().fileReader.getClassNameFromPath(document.fileName);
		return className ? UI5Parser.getInstance().classFactory.getUIClass(className) : undefined;
	}

	static toCustomUIClass(document: TextDocument) {
		let customUIClass: CustomUIClass | undefined;
		const className = UI5Parser.getInstance().fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = UI5Parser.getInstance().classFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass) {
				customUIClass = UIClass;
			}
		}
		return customUIClass;
	}
}