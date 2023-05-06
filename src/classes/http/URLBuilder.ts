import ParserPool from "../../parser/pool/ParserPool";
import { IParserConfigHandler } from "../config/IParserConfigHandler";
import { SAPNode } from "../librarydata/SAPNode";
import { AbstractJSClass } from "../parsing/ui5class/js/AbstractJSClass";

export class URLBuilder {
	private readonly _UI5Version: string;
	private readonly _URLHost: string;

	constructor(configHandler: IParserConfigHandler) {
		this._URLHost = configHandler.getDataSource();
		this._UI5Version = configHandler.getUI5Version();
	}

	getMarkupUrlForClassApi(SAPClass: SAPNode | AbstractJSClass) {
		const className =
			SAPClass instanceof SAPNode
				? SAPClass.getName()
				: SAPClass instanceof AbstractJSClass
				? SAPClass.className
				: "";

		if (ParserPool.getManifestForClass(className) || this._isNativeClass(className)) {
			return "";
		}

		return this._wrapInMarkup(this.getUrlForClassApi(SAPClass));
	}

	getMarkupUrlForPropertiesApi(SAPClass: AbstractJSClass) {
		if (ParserPool.getManifestForClass(SAPClass.className) || this._isNativeClass(SAPClass.className)) {
			return "";
		}

		return this._wrapInMarkup(this._getUrlForPropertiesApi(SAPClass));
	}

	getMarkupUrlForAggregationApi(SAPClass: AbstractJSClass) {
		if (ParserPool.getManifestForClass(SAPClass.className) || this._isNativeClass(SAPClass.className)) {
			return "";
		}

		return this._wrapInMarkup(this._geUrlForAggregationApi(SAPClass));
	}

	getMarkupUrlForAssociationApi(SAPClass: AbstractJSClass) {
		if (ParserPool.getManifestForClass(SAPClass.className) || this._isNativeClass(SAPClass.className)) {
			return "";
		}

		return this._wrapInMarkup(this._geUrlForAssociationApi(SAPClass));
	}

	getMarkupUrlForEventsApi(SAPClass: AbstractJSClass, eventName = "Events") {
		if (ParserPool.getManifestForClass(SAPClass.className) || this._isNativeClass(SAPClass.className)) {
			return "";
		}

		return this._wrapInMarkup(this._geUrlForEventsApi(SAPClass, eventName));
	}

	getMarkupUrlForMethodApi(SAPClass: AbstractJSClass | SAPNode, methodName: string) {
		const className =
			SAPClass instanceof SAPNode
				? SAPClass.getName()
				: SAPClass instanceof AbstractJSClass
				? SAPClass.className
				: "";

		if (ParserPool.getManifestForClass(className) || this._isNativeClass(className)) {
			return "";
		}

		return this._wrapInMarkup(this.getUrlForMethodApi(SAPClass, methodName));
	}

	getUrlForClassApi(SAPClass: SAPNode | AbstractJSClass) {
		const className =
			SAPClass instanceof SAPNode
				? SAPClass.getName()
				: SAPClass instanceof AbstractJSClass
				? SAPClass.className
				: "";

		if (ParserPool.getManifestForClass(className) || this._isNativeClass(className)) {
			return "";
		}

		return this._getUrlClassApiBase(className);
	}

	private _getUrlForPropertiesApi(SAPClass: AbstractJSClass) {
		const urlBase = this._getUrlClassApiBase(SAPClass.className);
		return `${urlBase}/controlProperties`;
	}

	private _geUrlForEventsApi(SAPClass: AbstractJSClass, eventName: string) {
		const urlBase = this._getUrlClassApiBase(SAPClass.className);
		return `${urlBase}/events/${eventName}`;
	}

	private _geUrlForAggregationApi(SAPClass: AbstractJSClass) {
		const urlBase = this._getUrlClassApiBase(SAPClass.className);
		return `${urlBase}/aggregations`;
	}

	private _geUrlForAssociationApi(SAPClass: AbstractJSClass) {
		const urlBase = this._getUrlClassApiBase(SAPClass.className);
		return `${urlBase}/associations`;
	}

	getUrlForMethodApi(SAPClass: AbstractJSClass | SAPNode, methodName: string) {
		const className =
			SAPClass instanceof SAPNode
				? SAPClass.getName()
				: SAPClass instanceof AbstractJSClass
				? SAPClass.className
				: "";
		if (ParserPool.getManifestForClass(className) || this._isNativeClass(className)) {
			return "";
		}

		const urlBase = this._getUrlClassApiBase(className);
		return `${urlBase}/methods/${methodName}`;
	}

	private _isNativeClass(className: string) {
		const standardClasses = ["array", "object", "promise", "function", "boolean", "void", "map"];

		return standardClasses.includes(className.toLowerCase());
	}

	getAPIIndexUrl() {
		return `${this._getUrlBase()}/docs/api/api-index.json`;
	}

	getDesignTimeUrlForLib(libDotNotation: string) {
		const libPath = libDotNotation.replace(/\./g, "/");

		return `${this._getUrlBase()}/test-resources/${libPath}/designtime/apiref/api.json`;
	}

	getIconURIs() {
		return [
			`${this._getUrlBase()}/test-resources/sap/m/demokit/iconExplorer/webapp/model/SAP-icons/groups.json`,
			`${this._getUrlBase()}/test-resources/sap/m/demokit/iconExplorer/webapp/model/SAP-icons-TNT/groups.json`,
			`${this._getUrlBase()}/test-resources/sap/m/demokit/iconExplorer/webapp/model/BusinessSuiteInAppSymbols/groups.json`
		];
	}

	private _wrapInMarkup(url: string) {
		return `[UI5 API](${url})\n`;
	}

	private _getUrlClassApiBase(className: string) {
		return `${this._getUrlBase()}#/api/${className}`;
	}

	private _getUrlBase() {
		return `${this._URLHost}${this._UI5Version}`;
	}

	getUrlBase() {
		return this._getUrlBase();
	}
}
