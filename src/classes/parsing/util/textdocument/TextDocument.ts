import { toNative } from "../filereader/AbstractFileReader";

export class TextDocument {
	readonly fileName: string;
	private readonly _text: string;
	constructor(text: string, fileName: string) {
		this._text = text;
		this.fileName = toNative(fileName);
	}
	getText() {
		return this._text;
	}

	isView() {
		return this.fileName.endsWith(".view.xml");
	}

	isFragment() {
		return this.fileName.endsWith(".fragment.xml");
	}

	isXML() {
		return this.isFragment() || this.isView();
	}

	isJS() {
		return this.fileName.endsWith(".js");
	}

	isTS() {
		return this.fileName.endsWith(".ts");
	}
}
