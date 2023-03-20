import { IUI5Parser } from "../../parser/abstraction/IUI5Parser";
import { URLBuilder } from "../http/URLBuilder";
import { IFileReader } from "../parsing/util/filereader/IFileReader";
import { SAPNode } from "./SAPNode";

export class UI5MetadataPreloader {
	private readonly _libNames: Record<string, any> = {};

	namespaceDesignTimes: Record<string, any> = {};
	private _resolveLibPreload!: (value: any) => void;
	libsPreloaded = new Promise(resolve => {
		this._resolveLibPreload = resolve;
	});
	private readonly parser: IUI5Parser;
	constructor(parser: IUI5Parser) {
		this.parser = parser;
	}

	async preloadLibs(nodes: SAPNode[]) {
		let cache = this._loadCache();
		if (!cache) {
			const promises = [];
			nodes.forEach((node: SAPNode) => {
				this._getUniqueLibNames(node);
			});

			for (const i in this._libNames) {
				promises.push(this.getMetadataForLib(i));
			}

			return Promise.all(promises).then(() => {
				cache = this.namespaceDesignTimes;
				this._writeCache();
				this._resolveLibPreload(cache);
			});
		} else {
			this.namespaceDesignTimes = cache;
			this._resolveLibPreload(cache);
			return new Promise(resolve => resolve(cache));
		}
	}

	async getMetadataForLib(lib: string) {
		return await this._fetchMetadataForLib(lib);
	}

	private _fetchMetadataForLib(lib: string) {
		return new Promise((resolve, reject) => {
			if (this.namespaceDesignTimes[lib]) {
				if (this.namespaceDesignTimes[lib].then) {
					this.namespaceDesignTimes[lib].then(() => {
						resolve(this.namespaceDesignTimes[lib]);
					});
				} else {
					resolve(this.namespaceDesignTimes[lib]);
				}
			} else {
				setTimeout(async () => {
					const readPath: string = new URLBuilder(this.parser.configHandler).getDesignTimeUrlForLib(lib);
					this.namespaceDesignTimes[lib] = this.parser.httpHandler.get(readPath);
					try {
						this.namespaceDesignTimes[lib] = await this.namespaceDesignTimes[lib];
						resolve(this.namespaceDesignTimes[lib]);
					} catch (error) {
						reject(error);
					}
				}, Math.round(Math.random() * 150));
			}
		});
	}

	private _loadCache() {
		return this.parser.fileReader.getCache(IFileReader.CacheType.Metadata);
	}

	private _writeCache() {
		const cache = JSON.stringify(this.namespaceDesignTimes);
		this.parser.fileReader.setCache(IFileReader.CacheType.Metadata, cache);
	}

	private _getUniqueLibNames(node: SAPNode) {
		this._libNames[node.getLib()] = "";
		if (node.nodes) {
			node.nodes.forEach(this._getUniqueLibNames, this);
		}
	}
}
