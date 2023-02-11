import { IUI5Parser } from "../../parser/IUI5Parser";
import { URLBuilder } from "../http/URLBuilder";
import { FileReader } from "../parsing/util/filereader/FileReader";
import { SAPNode } from "./SAPNode";

export class SAPNodeDAO {
	private _nodes: any;
	private readonly _SAPNodes: SAPNode[] = [];
	private readonly _flatSAPNodes: Record<string, SAPNode> = {};
	private readonly parser: IUI5Parser;
	constructor(parser: IUI5Parser) {
		this.parser = parser;
	}

	public async getAllNodes() {
		if (this._SAPNodes.length === 0) {
			await this._readAllNodes();
			await this._generateSAPNodes();
		}

		return this._SAPNodes;
	}

	public isInstanceOf(child: string, parent: string): boolean {
		let isInstance = child === parent;
		const parentNode = this.findNode(parent);

		const parentMetadata = parentNode?.getMetadata()?.getRawMetadata();
		isInstance = isInstance || !!parentMetadata?.implements?.includes(child);
		if (!isInstance && parentMetadata && parentMetadata?.extends) {
			isInstance = this.isInstanceOf(child, parentMetadata?.extends);
		}

		return isInstance;
	}

	private _getContentOfNode(node: SAPNode) {
		let children: SAPNode[] = [];
		children.push(node);

		if (node.nodes) {
			node.nodes.forEach(node => {
				children = children.concat(this._getContentOfNode(node));
			});
		}

		return children;
	}

	public getAllNodesSync() {
		return this._SAPNodes;
	}

	private async _generateSAPNodes() {
		const libs: any = this.parser.configHandler.getLibsToLoad();
		const libMap: any = {};
		libs.forEach((lib: any) => {
			libMap[lib] = true;
		});

		for (const node of this._nodes.symbols) {
			if (libMap[node.lib]) {
				const newNode = new SAPNode(node, this.parser.metadataDAO);
				this._SAPNodes.push(newNode);
			}
		}

		this._recursiveFlatNodeGeneration(this._SAPNodes);
	}

	recursiveModuleAssignment() {
		const nodes = this._SAPNodes;
		nodes.forEach(node => {
			if (node.getMetadata()?.getRawMetadata()) {
				const moduleName = node.getMetadata()?.getRawMetadata()?.module?.replace(/\//g, ".");
				if (moduleName !== node.getName()) {
					const moduleNode = this.findNode(moduleName);
					const nodeMetadata = node.getMetadata().getRawMetadata();
					if (moduleNode && nodeMetadata) {
						const rawMetadata = moduleNode.getMetadata().getRawMetadata();
						if (!rawMetadata.properties) {
							rawMetadata.properties = [];
						}
						const property = {
							name: nodeMetadata.name,
							visibility: nodeMetadata.visibility,
							description: nodeMetadata.description,
							type: node.getName()
						};
						rawMetadata.properties.push(property);
					}
				}
			}
		});
	}

	private _recursiveFlatNodeGeneration(nodes: SAPNode[]) {
		nodes.forEach(SAPNode => {
			this._flatSAPNodes[SAPNode.getName()] = SAPNode;
			if (SAPNode.nodes) {
				this._recursiveFlatNodeGeneration(SAPNode.nodes);
			}
		});
	}

	private async _readAllNodes() {
		this._nodes = this._getApiIndexFromCache();
		if (!this._nodes) {
			await this._fetchApiIndex();
			this._cacheApiIndex();
		}
	}

	private _getApiIndexFromCache() {
		return this.parser.fileReader.getCache(FileReader.CacheType.APIIndex);
	}

	private _cacheApiIndex() {
		const cache = JSON.stringify(this._nodes);
		this.parser.fileReader.setCache(FileReader.CacheType.APIIndex, cache);
	}

	private async _fetchApiIndex() {
		const path = new URLBuilder(this.parser.configHandler, this.parser.fileReader).getAPIIndexUrl();
		const data: any = await this.parser.httpHandler.get(path);
		this._nodes = data;
	}

	public findNode(name: string): SAPNode | undefined {
		return this._flatSAPNodes[name];
	}

	public getFlatNodes() {
		return this._flatSAPNodes;
	}
}
