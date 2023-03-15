import { Axios, AxiosRequestConfig } from "axios";
import * as https from "https";
import { IParserConfigHandler } from "../config/IParserConfigHandler";
export class HTTPHandler {
	private readonly configHandler: IParserConfigHandler;
	constructor(configHandler: IParserConfigHandler) {
		this.configHandler = configHandler;
	}
	async get(uri: string, options: AxiosRequestConfig = {}): Promise<any> {
		let data = {};

		const rejectUnauthorized = this.configHandler.getRejectUnauthorized();
		const agent = new https.Agent({
			rejectUnauthorized: !!rejectUnauthorized
		});
		options.httpsAgent = agent;

		try {
			const response = await new Axios(options).get(uri, {
				validateStatus: status => {
					return status >= 200 && status < 300;
				}
			});
			if (response.headers?.["content-type"] === "application/json") {
				data = JSON.parse(response.data);
			} else {
				data = response.data;
			}
		} catch (error: any) {
			const errorMessage = `Error occurred sending HTTP Request. Uri: "${uri}". Message: "${error.message}". Response data: "${error.response?.data}"`;
			console.error(errorMessage);
			throw new Error(errorMessage);
		}

		return data;
	}

	static async get(uri: string, options: AxiosRequestConfig = {}): Promise<any> {
		let data = {};

		try {
			const response = await new Axios(options).get(uri, {
				validateStatus: status => {
					return status >= 200 && status < 300;
				}
			});
			if (response.headers?.["content-type"] === "application/json") {
				data = JSON.parse(response.data);
			} else {
				data = response.data;
			}
		} catch (error: any) {
			const errorMessage = `Error occurred sending HTTP Request. Uri: "${uri}". Message: "${error.message}". Response data: "${error.response?.data}"`;
			console.error(errorMessage);
			throw new Error(errorMessage);
		}

		return data;
	}
}
