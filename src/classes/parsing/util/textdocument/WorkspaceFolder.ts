import { toNative } from "../filereader/AbstractFileReader";

export class WorkspaceFolder {
	readonly fsPath: string;
	constructor(fsPath: string) {
		this.fsPath = toNative(fsPath);
	}
}
