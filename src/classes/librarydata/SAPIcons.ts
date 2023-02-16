import { IUI5Parser } from "../../parser/abstraction/IUI5Parser";
import { URLBuilder } from "../http/URLBuilder";
import { JSFileReader } from "../parsing/util/filereader/JSFileReader";

export class SAPIcons {
	public icons: string[] = [];
	private readonly parser: IUI5Parser;
	constructor(parser: IUI5Parser) {
		this.parser = parser;
	}

	async preloadIcons() {
		this.icons = this.parser.fileReader.getCache(JSFileReader.CacheType.Icons);
		if (!this.icons) {
			this.icons = await this._loadIcons();
			this.parser.fileReader.setCache(JSFileReader.CacheType.Icons, JSON.stringify(this.icons));
		}
	}

	private async _loadIcons() {
		const uris: string[] = new URLBuilder(this.parser.configHandler, this.parser.fileReader).getIconURIs();
		let icons: string[] = [];
		const aIconResponses = await Promise.all(uris.map(uri => this._requestJSONData(uri)));
		aIconResponses.forEach((iconResponse: any) => {
			let uniqueIcons: any[] = [];
			iconResponse.groups.forEach((group: any) => {
				uniqueIcons = uniqueIcons.concat(group.icons);
			});

			uniqueIcons = uniqueIcons.map(icon => `sap-icon://${icon.name}`);

			icons = icons.concat(uniqueIcons);
		});

		icons = [...new Set(icons)];

		return icons;
	}

	private async _requestJSONData(uri: string) {
		const data: any = await this.parser.httpHandler.get(uri);

		return data;
	}
}
