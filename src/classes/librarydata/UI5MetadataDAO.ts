import { IUI5Parser } from "../../parser/abstraction/IUI5Parser";
import { SAPNode } from "./SAPNode";
import { UI5Metadata } from "./UI5Metadata";
import { UI5MetadataPreloader } from "./UI5MetadataPreloader";
export class UI5MetadataDAO {
	metadataPreloader: UI5MetadataPreloader;
	constructor(parser: IUI5Parser) {
		this.metadataPreloader = new UI5MetadataPreloader(parser);
	}

	loadMetadata(nodes: SAPNode[]) {
		return this.metadataPreloader.preloadLibs(nodes);
	}

	getPreloadedMetadataForNode(node: SAPNode) {
		const libMetadata = this.metadataPreloader.namespaceDesignTimes[node.getLib()];
		const metadata = this._findNodeMetadata(node, libMetadata);

		return new UI5Metadata(metadata);
	}

	private _findNodeMetadata(node: SAPNode, libMetadata: any) {
		return libMetadata?.symbols
			? libMetadata.symbols.find(
					(metadata: any) => metadata.name.replace("module:", "").replace(/\//g, ".") === node.getName()
			  )
			: {};
	}
}
