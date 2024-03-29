import { Properties } from "properties-file";
import { IUI5Parser } from "../../../../parser/abstraction/IUI5Parser";
import { AbstractCustomClass, UI5Ignoreable } from "../../ui5class/AbstractCustomClass";
import { TextDocument } from "../textdocument/TextDocument";
import LineColumn = require("line-column");

export interface IInternalizationText extends UI5Ignoreable {
	text: string;
	description: string;
	id: string;
	positionBegin: number;
	positionEnd: number;
	hasKeyCollisions: boolean;
}
interface IResourceModel {
	[key: string]: IInternalizationText[];
}

export class ResourceModelData {
	protected readonly parser: IUI5Parser<AbstractCustomClass>;
	constructor(parser: IUI5Parser<AbstractCustomClass>) {
		this.parser = parser;
	}
	resourceModels: IResourceModel = {};

	async readTexts() {
		const resourceModelFiles = this.parser.fileReader.getResourceModelFiles();
		resourceModelFiles.forEach(resourceModelFile => {
			this._updateResourceModelData(resourceModelFile);
		});
	}

	private _updateResourceModelData(resourceModelFile: { content: string; componentName: string }) {
		this.resourceModels[resourceModelFile.componentName] = ResourceModelData.parseFile(resourceModelFile);
	}

	static parseFile(resourceModelFile: { content: string; componentName: string }) {
		const lineColumn = LineColumn(resourceModelFile.content);
		const propertyFile = new Properties(resourceModelFile.content);

		const lines = (propertyFile as unknown as { lines: string[] })?.lines ?? [];
		return propertyFile.collection.map(translation => {
			return {
				text: `{i18n>${translation.key}}`,
				description: translation.value,
				id: translation.key,
				ui5ignored: ["#@ui5ignore", "# @ui5ignore"].includes(lines[translation.startingLineNumber - 2]),
				hasKeyCollisions: translation.hasKeyCollisions,
				positionBegin: lineColumn.toIndex(translation.startingLineNumber, 1),
				positionEnd:
					lineColumn.toIndex(translation.endingLineNumber, 1) +
					lines[translation.endingLineNumber - 1].length
			};
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
