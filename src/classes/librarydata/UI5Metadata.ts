export class UI5Metadata {
	readonly rawMetadata: any;
	constructor(metadata: any) {
		this.rawMetadata = metadata;
	}

	getUI5Metadata(): any | undefined {
		return this.rawMetadata && this.rawMetadata["ui5-metadata"];
	}

	getRawMetadata() {
		return this.rawMetadata;
	}
}
