import axios, { AxiosRequestConfig } from "axios";
import * as https from "https";
import { UI5Parser } from "../../UI5Parser";
export class HTTPHandler {
	static async get(uri: string, options: AxiosRequestConfig = {}): Promise<any> {
		let data = {};

		const rejectUnauthorized = UI5Parser.getInstance().configHandler.getRejectUnauthorized();
		const agent = new https.Agent({
			rejectUnauthorized: !!rejectUnauthorized
		});
		options.httpsAgent = agent;

		try {
			data = (await axios.get(uri, options)).data;
		} catch (error: any) {
			console.error(`Error occurred sending HTTP Request. Message: "${error.message}". Response data: "${error.response?.data}"`);
			throw error;
		}

		return data;
	}
}