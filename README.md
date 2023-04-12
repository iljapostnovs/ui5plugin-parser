# UI5 Class Parser

Parser package for UI5 based projects

Primarely used by `ui5plugin-linter` package and Visual Studio Code SAPUI5 Extension

---

Any support is highly appreciated!<br/>
[<img src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86" height="30"/>](https://github.com/sponsors/iljapostnovs)
[<img src="https://newbie.zeromesh.net/donate.7.6.svg" height="30"/>](https://donate.cafe/iljapostnovs)

---

### Default Config Handler

By default parser uses PackageParserConfigHandler, which reads the data from `package.json` in CWD.

### package.json config interface

PackageParserConfigHandler uses `IUI5PackageConfigEntry` interface in order to get the config.

```ts
interface IUI5PackageConfigEntry {
	ui5?: IUI5ParserEntry;
}
interface IUI5ParserEntry {
	ui5parser?: IUI5ParserEntryFields;
}
interface IUI5ParserEntryFields {
	ui5version?: string;
	excludeFolderPatterns?: string[];
	dataSource?: string;
	rejectUnauthorized?: boolean;
	libsToLoad?: string[];
	additionalWorkspaces?: string[];
	proxyWorkspaces?: string[];
}
```

### Config default values

Default package.json config looks as follows:

```json
{
	"ui5": {
		"ui5parser": {
			"ui5version": "1.84.30",
			"excludeFolderPatterns": ["**/resources/**", "**/dist/**", "**/node_modules/**"],
			"dataSource": "https://ui5.sap.com/",
			"rejectUnauthorized": false,
			"libsToLoad": [
				"sap.m",
				"sap.ui.comp",
				"sap.f",
				"sap.ui.core",
				"sap.ui.commons",
				"sap.ui.export",
				"sap.ui.layout",
				"sap.ui.support",
				"sap.ui.table",
				"sap.ui.unified",
				"sap.ushell",
				"sap.tnt",
				"sap.suite.ui.microchart"
			],
			//Handy to add additional workspace paths if e.g. library is outside of CWD
			"additionalWorkspaces": ["../MyLibrary"],
			//option to tell explicitly where UI5 projects are relative to CWD, useful for CAP projects
			"proxyWorkspaces": ["./MyFEApp1", "./MyFEApp2"]
		}
	}
}
```

These are default values, which can be overriden.

> In case of `libsToLoad` and `excludeFolderPatterns` all additional values which are added in package.json will be added to the default values, not rewritten.

---

## How to use

Initialization process reads the metadata of standard SAPUI5 classes and parses all projects in CWD (Current working directory), it's encapsulated into `createInstances` method. For getting parsers just call it.

```ts
const wsFolders = [new WorkspaceFolder("Absolute path to the workspace")];
const parsers = await ParserFactory.createInstances(wsFolders);
```

Necessary methods for getting information about the classes exists `ParserPool` class, which works with all parser instances. As an example, to get the parser for custom class, `getParserForCustomClass` can be used:

```ts
const parser = ParserPool.getParserForCustomClass("com.test.any.class");
const UIClass = parser.classFactory.getUIClass("com.test.any.class");
```

### TS vs JS

#### Initialization

If `tsconfig.json` is found in the CWD and any `.ts` files are found in the workspace, parser considers that it's TS project. <br/>
`tsconfig.json` should be located in CWD.

#### Folder exclusions

For convenience purposes `UI5TSParser` ignores `src-gen` folder, because they contain transpiled JS/XML files, which can make the parser to think that source files are there. If build folder name is different, is should be added to `excludeFolderPatterns` in your `package.json`. If you are using older tooling with manual babel transpiler which generates `webapp` folder, it should be added to `excludeFolderPatterns` as well

### Usage

How to get info about a JS/TS Class:

```ts
const UIClass = parser.classFactory.getUIClass("com.test.any.class");
```

UIClass will have class metadata such as fields, methods, properties, aggregations, associations, events etc.

> _TS only!_ For performance reasons TS parser doesn't parse types right away. If you want to load all type info such as method return type, parameter types etc, please use `UIClass.loadTypes()`
