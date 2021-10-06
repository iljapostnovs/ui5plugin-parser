# UI5 Class Parser
Parser package for UI5 based projects

Primarely used by ui5plugin-linter package and Visual Studio Code SAPUI5 Extension

## How to use
Parser is a singleton, so you should get an instance first and initialize right away.
Initialization process reads the metadata of standard SAPUI5 classes and parses all projects in CWD (Current working directory).
```ts
const parser = UI5Parser.getInstance();
await parser.initialize();
```

### Constructor
It is possible to pass parameters to getInstance method, its signature allowes to pass an object which implements such an interface:
```ts
interface IConstructorParams {
  fileReader?: IFileReader;
  classFactory?: IUIClassFactory;
  configHandler?: IParserConfigHandler;
}
```
The only parameter which theoretically could be interesting to anybody is configHandler.
It is possible to implement ```IParserConfigHandler``` interface and provide your own config handling.
IParserConfigHandler looks as follows:
```ts
interface IParserConfigHandler {
  getUI5Version(): string;
  getExcludeFolderPatterns(): string[];
  getDataSource(): string;
  getRejectUnauthorized(): boolean;
  getLibsToLoad(): string[];
}
```

### Usage
How to get info about a JS Class:
```ts
const UIClass = parser.classFactory.getUIClass("com.test.any.class")
```
UIClass will have class metadata such as fields, methods, properties, aggregations, associations, events etc.

### Default Config Handler
By default parser uses PackageParserConfigHandler, which reads the data from ```package.json``` in CWD.

### package.json config interface
PackageParserConfigHandler uses ```IUI5PackageConfigEntry``` interface in order to get the config.
```ts
interface IUI5PackageConfigEntry {
  ui5?: IUI5ParserEntry
}
interface IUI5ParserEntry {
  ui5parser?: IUI5ParserEntryFields
}
interface IUI5ParserEntryFields {
  ui5version?: string;
  excludeFolderPatterns?: string[];
  dataSource?: string;
  rejectUnauthorized?: boolean;
  libsToLoad?: string[];
}
```

### Config default values
Default package.json config looks as follows:
```json
{
  "ui5": {
    "ui5parser": {
      "ui5version": "1.60.10",
      "excludeFolderPatterns": [
        "**/resources/**",
        "**/dist/**/**",
        "**/node_modules/**"
      ],
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
      ]
    }
  }
}
```
Theese are default values, which can be overriden.
> In case of ```libsToLoad``` all additional libraries which are added in package.json will be added to the default values, not rewritten.