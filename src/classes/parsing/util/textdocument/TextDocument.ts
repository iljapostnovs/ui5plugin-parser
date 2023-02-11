export class TextDocument {
	readonly fileName: string;
	private readonly _text: string;
	constructor(text: string, fileName: string) {
		this._text = text;
		this.fileName = fileName;
	}
	getText() {
		return this._text;
	}
}