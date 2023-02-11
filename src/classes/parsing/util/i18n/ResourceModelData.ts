import { IUI5Parser } from "../../../../parser/IUI5Parser";
import { AbstractCustomClass } from "../../ui5class/AbstractCustomClass";
import { TextDocument } from "../textdocument/TextDocument";

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
	protected readonly parser: IUI5Parser<AbstractCustomClass>;
	constructor(parser: IUI5Parser<AbstractCustomClass>) {
		this.parser = parser;
	}
	public resourceModels: IResourceModel = {};

	async readTexts() {
		const resourceModelFiles = this.parser.fileReader.getResourceModelFiles();
		resourceModelFiles.forEach(resourceModelFile => {
			this._updateResourceModelData(resourceModelFile);
		});
	}

	private _updateResourceModelData(resourceModelFile: { content: string; componentName: string }) {
		this.resourceModels[resourceModelFile.componentName] = [];

		const texts = resourceModelFile.content.match(/.*?([a-zA-Z]|\s|\d)=.*([a-zA-Z]|\s|\d)/g);
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

	updateCache(document: TextDocument) {
		const className = this.parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const manifest = this.parser.fileReader.getManifestForClass(className);
			if (manifest) {
				this._updateResourceModelData({
					componentName: manifest.componentName,
					content: document.getText()
				});
			}
		}
	}
}
