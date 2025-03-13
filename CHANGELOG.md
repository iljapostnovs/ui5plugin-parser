## 1.7.8 (13-03-2025)

-   fix application/json header issue

## 1.7.7 (25-01-2024)

-   Update default UI5 version to 1.108.27

## 1.7.6 (25-01-2024)

-   Refactor resource model data class
-   update dependencies

## 1.7.5 (25-12-2023)

-   Fragment determination in XML files fix

## 1.7.4 (23-11-2023)

-   Global variable searching fix

## 1.7.3 (23-11-2023)

-   Unexpected parsing exception fix

## 1.7.2 (23-11-2023)

-   API bugfix

## 1.7.1 (23-11-2023)

-   Various small parsing bugfixes

## 1.7.0 (09-11-2023)

-   Variable declarations are now being searched above class declaration as well

## 1.6.4 (16-10-2023)

-   Now as a fallback for TS parsing if no default exported class or object is found, first class declaration is taken as main class in the file which will be parsed

## 1.6.3 (07-10-2023)

-   Regex bugfix

## 1.6.2 (02-10-2023)

-   Minor bugfixes

## 1.6.1 (13-08-2023)

-   Additional dependencies are exported now

## 1.6.0 (22-07-2023)

-   `nodeProjects` configuration option added. [Readme](README.md#node-projects)

## 1.5.6 (27-06-2023)

-   Add `configPath` to `IParserConfigHandler`

## 1.5.5 (23-06-2023)

-   Fix config finding going into recursive

## 1.5.4 (19-06-2023)

-   Upgrade typescript to 5.1.3

## 1.5.3 (14-06-2023)

-   Migrate to fixed version of `rc-config-loader`

## 1.5.2 (13-06-2023)

-   Migrate to `cosmiconfig`

## 1.5.1 (12-06-2023)

-   Bugfix for `package.json` config

## 1.5.0 (12-06-2023)

-   Support for [rc](https://github.com/azu/rc-config-loader) files introduced

## 1.4.6 (02-06-2023)

-   Update readme

## 1.4.5 (01-06-2023)

-   Fix finding of the default model for TS
-   Fix link generation from UI5 docs

## 1.4.4 (25-05-2023)

-   Fix links in description of the classes

## 1.4.3 (16-05-2023)

-   Filter constructor params by depth

## 1.4.2 (16-05-2023)

-   Add ui5ignored property to ResourceModelData entries

## 1.4.1 (09-05-2023)

-   Set bigger position difference for JSClass JSDoc finding

## 1.4.0 (09-05-2023)

-   Parsing of `.properties` file migrated to [properties-file](https://github.com/Avansai/properties-file) package

## 1.3.0 (07-05-2023)

-   Add special settings support

## 1.2.3 (07-05-2023)

-   Fix assigning of `any` type to variables

## 1.2.2 (07-05-2023)

-   `byId` exceptions adapted to new standart types

## 1.2.1 (07-05-2023)

-   `ArrayPattern` and `ChainExpression` support added

## 1.2.0 (07-05-2023)

-   `ForOfStatement` and `AssignmentPattern` support added
-   Minor syntax analyser improvements
-   `@ui5model`, `@abstract` jsdoc support for classes added
-   Classes now have description

## 1.1.1 (06-05-2023)

-   `additionalWorkspaces` now accepts absolute path as well

## 1.1.0 (01-05-2023)

-   Global package configuration option added

## 1.0.0 (12-04-2023)

-   Typescript updated to v5.0.2
-   Remove all singletones. Now parser supports multiple parser instances
-   `additionalWorkspaces` config entry added
-   `proxyWorkspaces` config entry added
-   `webapp` folder is not automatically excluded for TS projects anymore

## 0.7.11 (04-02-2023)

-   Add exclusion for doctype tag

## 0.7.10 (04-02-2023)

-   Ignore doctype tags [#188](https://github.com/iljapostnovs/VSCodeUI5Plugin/issues/188)

## 0.7.9 (01-02-2023)

-   Fix xml parser [#291](https://github.com/iljapostnovs/VSCodeUI5Plugin/issues/291)

## 0.7.8 (26-01-2023)

-   Throw errors on failed http requests

## 0.7.7 (26-01-2023)

-   Bugfix for [#61](https://github.com/iljapostnovs/ui5plugin-parser/issues/61)

## 0.7.6 (25-01-2023)

-   Bugfix for [#59](https://github.com/iljapostnovs/ui5plugin-parser/issues/59)
-   Bugfix for [#61](https://github.com/iljapostnovs/ui5plugin-parser/issues/61)

## 0.7.5 (28-11-2022)

-   Now parser checks both for `.ts` files and `tsconfig.json` existence

## 0.7.4 (06-11-2022)

-   Fix initialization

## 0.7.3 (06-11-2022)

-   Add additional typechecking to xml parser

## 0.7.2 (06-11-2022)

-   Return type bugfixes

## 0.7.1 (29-10-2022)

-   Fix i18n regex

## 0.7.0 (26-10-2022)

-   Add CustomTSObject

## 0.6.6 (25-10-2022)

-   Fill UIDefine first

## 0.6.5 (25-10-2022)

-   Try to guess type from UI Define

## 0.6.4 (24-10-2022)

-   Parsing bugfixes

## 0.6.3 (24-10-2022)

-   Initialization bugfixes

## 0.6.2 (24-10-2022)

-   Performance improvements

## 0.6.1 (19-10-2022)

-   Improve TS caching

## 0.6.0 (18-10-2022)

-   Add typescript support

## 0.5.23 (23-08-2022)

-   Add new tag position

## 0.5.22 (02-05-2021)

-   Bugfixes for parsing class metadata

## 0.5.21 (23-04-2021)

-   Bugfixes for cmd: support

## 0.5.20 (13-04-2021)

-   Add cmd: support for XML Parser

## 0.5.19 (12-01-2021)

-   Acorn syntax analyzer bugfix

## 0.5.18 (29-11-2021)

-   Make event handler params respect jsdocs

## 0.5.17 (29-11-2021)

-   Minor bugfixes

## 0.5.16 (28-11-2021)

-   Improve reference finder

## 0.5.15 (05-11-2021)

-   Bugfixes

## 0.5.14 (05-11-2021)

-   Add regexp parsing

## 0.5.13 (05-11-2021)

-   Add template literal support

## 0.5.12 (17-10-2021)

-   Bugfixes

## 0.5.11 (14-10-2021)

-   Remove filter for deprecated methods

## 0.5.10 (14-10-2021)

-   Remove console.log for "Libs are preloaded"
-   Add deprecated jsdoc support for class members

## 0.5.9 (14-10-2021)

-   Bugfix for parsing byId method

## 0.5.8 (12-10-2021)

-   Bugfix for finding type of the fields if it is given in jsdoc

## 0.5.7 (12-10-2021)

-   Fix error on clear cache

## 0.5.6 (12-10-2021)

-   Added possibility to clear cache

## 0.5.5 (11-10-2021)

-   Cache bugfixes

## 0.5.4 (11-10-2021)

-   Remove dynamic require for package.json reading

## 0.5.3 (09-10-2021)

-   Bugfixes for case sensitive file reading

## 0.5.2 (07-10-2021)

-   Readme adjustments

## 0.5.1 (07-10-2021)

-   Initial release
