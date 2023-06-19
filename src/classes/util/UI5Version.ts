export default class UI5Version {
	private readonly _version: string;
	private readonly _parsedVersion: { major: number; minor: number; patch: number };
	constructor(version: string) {
		this._version = version;
		this._parsedVersion = this._parseVersion(version);
	}
	private _parseVersion(version: string) {
		const [major, minor, patch] = version.split(".");

		return {
			major: parseInt(major, 10),
			minor: parseInt(minor, 10),
			patch: parseInt(patch ?? 0, 10)
		};
	}

	isGreaterThan(version: UI5Version) {
		return (
			this._parsedVersion.major > version._parsedVersion.major ||
			this._parsedVersion.minor > version._parsedVersion.minor ||
			this._parsedVersion.patch > version._parsedVersion.patch
		);
	}

	isLesserThan(version: UI5Version) {
		return (
			this._parsedVersion.major < version._parsedVersion.major ||
			this._parsedVersion.minor < version._parsedVersion.minor ||
			this._parsedVersion.patch < version._parsedVersion.patch
		);
	}

	equals(version: UI5Version) {
		return (
			this._parsedVersion.major === version._parsedVersion.major &&
			this._parsedVersion.minor === version._parsedVersion.minor &&
			this._parsedVersion.patch === version._parsedVersion.patch
		);
	}
}
