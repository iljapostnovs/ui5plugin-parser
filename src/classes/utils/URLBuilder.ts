import { IParserConfigHandler } from "../config/IParserConfigHandler";
import { SAPNode } from "../librarydata/SAPNode";
import { AbstractUIClass } from "../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { IFileReader } from "./IFileReader";

export class URLBuilder {
	private readonly _UI5Version: string;
	private readonly _URLHost: string;
	private readonly _fileReader: IFileReader;

	constructor(configHandler: IParserConfigHandler, fileReader: IFileReader) {
		this._URLHost = configHandler.getDataSource();
		this._UI5Version = configHandler.getUI5Version();
		this._fileReader = fileReader;
	}

	getMarkupUrlForClassApi(SAPClass: SAPNode | AbstractUIClass) {
		const className =
			SAPClass instanceof SAPNode
				? SAPClass.getName()
				: SAPClass instanceof AbstractUIClass
				? SAPClass.className
				: "";

		if (
			this._fileReader.getManifestForClass(className) ||
			this._isStandardClass(className)
		) {
			return "";
		}

		return this._wrapInMarkup(this.getUrlForClassApi(SAPClass));
	}

	getMarkupUrlForPropertiesApi(SAPClass: AbstractUIClass) {
		if (
			this._fileReader.getManifestForClass(SAPClass.className) ||
			this._isStandardClass(SAPClass.className)
		) {
			return "";
		}

		return this._wrapInMarkup(this._getUrlForPropertiesApi(SAPClass));
	}

	getMarkupUrlForAggregationApi(SAPClass: AbstractUIClass) {
		if (
			this._fileReader.getManifestForClass(SAPClass.className) ||
			this._isStandardClass(SAPClass.className)
		) {
			return "";
		}

		return this._wrapInMarkup(this._geUrlForAggregationApi(SAPClass));
	}

	getMarkupUrlForAssociationApi(SAPClass: AbstractUIClass) {
		if (
			this._fileReader.getManifestForClass(SAPClass.className) ||
			this._isStandardClass(SAPClass.className)
		) {
			return "";
		}

		return this._wrapInMarkup(this._geUrlForAssociationApi(SAPClass));
	}

	getMarkupUrlForEventsApi(SAPClass: AbstractUIClass, eventName = "Events") {
		if (
			this._fileReader.getManifestForClass(SAPClass.className) ||
			this._isStandardClass(SAPClass.className)
		) {
			return "";
		}

		return this._wrapInMarkup(this._geUrlForEventsApi(SAPClass, eventName));
	}

	getMarkupUrlForMethodApi(SAPClass: AbstractUIClass | SAPNode, methodName: string) {
		const className =
			SAPClass instanceof SAPNode
				? SAPClass.getName()
				: SAPClass instanceof AbstractUIClass
				? SAPClass.className
				: "";

		if (
			this._fileReader.getManifestForClass(className) ||
			this._isStandardClass(className)
		) {
			return "";
		}

		return this._wrapInMarkup(this.getUrlForMethodApi(SAPClass, methodName));
	}

	getUrlForClassApi(SAPClass: SAPNode | AbstractUIClass) {
		const className =
			SAPClass instanceof SAPNode
				? SAPClass.getName()
				: SAPClass instanceof AbstractUIClass
				? SAPClass.className
				: "";

		if (
			this._fileReader.getManifestForClass(className) ||
			this._isStandardClass(className)
		) {
			return "";
		}

		return this._getUrlClassApiBase(className);
	}

	private _getUrlForPropertiesApi(SAPClass: AbstractUIClass) {
		const urlBase = this._getUrlClassApiBase(SAPClass.className);
		return `${urlBase}/controlProperties`;
	}

	private _geUrlForEventsApi(SAPClass: AbstractUIClass, eventName: string) {
		const urlBase = this._getUrlClassApiBase(SAPClass.className);
		return `${urlBase}/events/${eventName}`;
	}

	private _geUrlForAggregationApi(SAPClass: AbstractUIClass) {
		const urlBase = this._getUrlClassApiBase(SAPClass.className);
		return `${urlBase}/aggregations`;
	}

	private _geUrlForAssociationApi(SAPClass: AbstractUIClass) {
		const urlBase = this._getUrlClassApiBase(SAPClass.className);
		return `${urlBase}/associations`;
	}

	getUrlForMethodApi(SAPClass: AbstractUIClass | SAPNode, methodName: string) {
		const className =
			SAPClass instanceof SAPNode
				? SAPClass.getName()
				: SAPClass instanceof AbstractUIClass
				? SAPClass.className
				: "";
		if (
			this._fileReader.getManifestForClass(className) ||
			this._isStandardClass(className)
		) {
			return "";
		}

		const urlBase = this._getUrlClassApiBase(className);
		return `${urlBase}/methods/${methodName}`;
	}

	private _isStandardClass(className: string) {
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
}
