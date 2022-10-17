import { AbstractUI5Parser } from "../../IUI5Parser";
import { UI5Parser } from "../../UI5Parser";
import { TextDocument } from "./abstraction/TextDocument";

export interface IInternalizationText {
	text: string;
	description: string;
	id: string;
	positionBegin: number;
	positionEnd: number;
}
interface IResourceModel {
	[key: string]: IInternalizationText[];
}

export class ResourceModelData {
	public static resourceModels: IResourceModel = {};

	static async readTexts() {
		const resourceModelFiles = AbstractUI5Parser.getInstance(UI5Parser).fileReader.getResourceModelFiles();
		resourceModelFiles.forEach(resourceModelFile => {
			this._updateResourceModelData(resourceModelFile);
		});
	}

	private static _updateResourceModelData(resourceModelFile: { content: string; componentName: string }) {
		this.resourceModels[resourceModelFile.componentName] = [];

		const texts = resourceModelFile.content.match(/.*?([a-zA-Z]|\s)=.*([a-zA-Z]|\s)/g);
		texts?.forEach(text => {
			const textParts = text.split("=");
			const textId = textParts.shift()?.trim();
			const textDescription = textParts.join("=").trim();
			this.resourceModels[resourceModelFile.componentName].push({
				text: `{i18n>${textId}}`,
				description: textDescription,
				id: textId || "",
				positionBegin: resourceModelFile.content.indexOf(text),
				positionEnd: resourceModelFile.content.indexOf(text) + text.length
			});
		});
	}

	static updateCache(document: TextDocument) {
		const className = AbstractUI5Parser.getInstance(UI5Parser).fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const manifest = AbstractUI5Parser.getInstance(UI5Parser).fileReader.getManifestForClass(className);
			if (manifest) {
				this._updateResourceModelData({
					componentName: manifest.componentName,
					content: document.getText()
				});
			}
		}
	}
}
