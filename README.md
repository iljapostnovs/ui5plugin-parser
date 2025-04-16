# UI5 Class Parser

Parser package for UI5 based projects

Primarely used by `ui5plugin-linter` package and Visual Studio Code SAPUI5 Extension

---

Any support is highly appreciated!<br/>
[<img src="images/paypal-donate-button.png" height="30"/>](https://www.paypal.com/donate/?hosted_button_id=HPZ5FA8C3KJ6W)
[<img src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86" height="30"/>](https://github.com/sponsors/iljapostnovs)
[<img src="./images/donate.png" height="30"/>](https://donate.cafe/iljapostnovs)

---

# Summary

-   [Configuration](#configuration)
    -   [RC and package.json](#rc-and-packagejson)
    -   [Config interface](#config-interface)
    -   [Config default values](#config-default-values)
-   [Parser instantiation logic](#parser-instantiation-logic)
	-   [Additional Workspaces](#additional-workspaces)
	-   [Proxy Workspaces](#proxy-workspaces)
	-   [Node projects](#node-projects)
-   [TS vs JS](#ts-vs-js)
	-   [Initialization](#initialization)
	-   [Folder exclusions](#folder-exclusions)
-   [How to use](#how-to-use)

## Configuration

### RC and package.json

Configuration can be done in `package.json` or in any of `rc` file types:
 - `.ui5pluginrc`
 - `.ui5pluginrc.json`
 - `.ui5pluginrc.yaml`
 - `.ui5pluginrc.yml`
 - `.ui5pluginrc.js`

 For simplicity purposes all examples are written for `package.json`, but it works the same way for all file types.

### Config interface

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
	nodeProjects?: string[];
	proxyWorkspaces?: string[];
}
```

### Config default values

Default `package.json` or `rc` file config looks as follows:

```jsonc
{
	"ui5": {
		"ui5parser": {
			// UI5 Version for standard library metadata preload from ui5.sap.com. If no patch level is added, latest patch will be loaded and used.
			"ui5version": "1.120",
			// Folder GLOB patterns which should be excluded from reading by parser
			"excludeFolderPatterns": ["**/resources/**", "**/dist/**", "**/node_modules/**"],
			// Source for standard library metadata preload
			"dataSource": "https://ui5.sap.com/",
			// For HTTP requests to dataSource
			"rejectUnauthorized": false,
			// List of libraries to be loaded
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
			//Handy to add additional workspace paths if e.g. library is outside of CWD. See "Additional workspaces" section for more details
			"additionalWorkspaces": ["../MyLibrary"],
			//option to tell explicitly where UI5 projects are relative to CWD, useful for CAP projects. See "Proxy workspaces" section for more details
			"proxyWorkspaces": ["./MyFEApp1", "./MyFEApp2"],
			// This configuration entry tries to parse UI5 project from node_modules folder. Requires "-dbg.js" files and "manifest.json" to be there.
			"nodeProjects": ["my-node-library"]
		}
	}
}
```

These are default values, which can be overriden.

> In case of `libsToLoad` and `excludeFolderPatterns` all additional values which are added in package.json will be added to the default values, not rewritten.

---

### Parser instantiation logic

Let's introduce two terms which will be used here:

-   **CWD** - current working directory, or the root folder of the project which is opened in the VSCode.
-   **Workspace** - UI5 workspace, or the folder which has `manifest.json` in it.

```
--- CWD ---
├── webapp
--- Workspace 1 ---
│   ├── Component.js
│   └── manifest.json
├── library
--- Workspace 2 ---
│   ├── library.js
│   └── manifest.json
└── package.json
```

The basic way for instantiating the parser looks as follows:

-   Read `package.json` in `CWD` and use it as a configuration source
-   Read all `Workspaces` and create UI5 Parser instance for it, using `package.json` as configuration source from previous step
-   If `CWD` has `tsconfig.json` and any `.ts` files, it is considered to be TS project. Otherwise it's JS project.

> **Important!** Take in mind that nested projects are not supported anymore, which means that there can be no folders with such structure:

```
├── webapp
│   ├── library
│   │   ├── library.js
│   │   └── manifest.json
│   ├── Component.js
│   └── manifest.json
```

> The structure which will work as expected:

```
├── library
│   ├── library.js
│   └── manifest.json
├── webapp
│   ├── Component.js
│   └── manifest.json
```

---

#### Additional Workspaces

If there is a e.g. library outside of the `CWD`, checkout `additionalWorkspaces` config for `ui5parser`.
Example:

```
├── MyApp (CWD)
│   │   ├── webapp
│   │   │   ├── manifest.json
│   │   │   └── Component.js
│   └── package.json
├── MyLibrary (Outside of CWD)
│   │   ├── src
│   │   │   ├── manifest.json
│   │   │   └── library.js
│   └── package.json
└── tsconfig.json
```

To make this work, corresponding entry in `package.json` should be added

```json
"ui5": {
   "ui5parser": {
      "additionalWorkspaces" : ["../MyLibrary"]
   }
}
```

---

#### Proxy Workspaces

There are cases when project is mixed, meaning that one folder may contain many different projects inside, non-ui5 as well. Most frequent case would be CAP project with both backend and frontend in one folder.

Example:

```
├── frontend
│   ├── webapp
│   │   └── manifest.json
│   ├── package.json (<- this file will be used as configuration source after proxyWorkspaces is configured)
│   └── tsconfig.json
├── backend
│   ├── Whatever.js
│   └── package.json
├── package.json (<- proxyWorkspaces should be configured here)
└── tsconfig.json
```

To make the parser work only for `frontend` folder, corresponding entry in `package.json` should be added

```json
"ui5": {
   "ui5parser": {
      "proxyWorkspaces" : ["./frontend"]
   }
}
```

What happens is that `CWD` is replaced with the new path from `proxyWorkspaces`, so at instantiation stage `package.json` and `tsconfig.json` from `frontend` folder will be used instead of root folder.

---

#### Node projects

There are cases when custom projects (e.g. libraries) installed via `npm` are used, for that purpose `nodeProjects` configuration entry was created.
Example:

`npm install my-custom-library`

`package.json`:
```json
"ui5": {
   "ui5parser": {
		"nodeProjects": ["my-custom-library"]
   }
}
```

> **Important!** In order to get the project parsed properly, it should have `-dbg.js` files and `manifest.json`. Configuration will be inherited from main project (project in `CWD`). In other words, npm packages which were not built properly and have no `manifest.json` will not work.


---

## TS vs JS

### Initialization

If `tsconfig.json` is found in the CWD and any `.ts` files are found in the workspace, parser considers that it's TS project. <br/>
`tsconfig.json` should be located in CWD.

### Folder exclusions

For convenience purposes `UI5TSParser` ignores `src-gen` folder, because they contain transpiled JS/XML files, which can make the parser to think that source files are there. If build folder name is different, is should be added to `excludeFolderPatterns` in your `package.json`. If you are using older tooling with manual babel transpiler which generates `webapp` folder, it should be added to `excludeFolderPatterns` as well

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

UIClass will have class metadata such as fields, methods, properties, aggregations, associations, events etc.

> _TS only!_ For performance reasons TS parser doesn't parse types right away. If you want to load all type info such as method return type, parameter types etc, please use `UIClass.loadTypes()`
