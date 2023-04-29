## 1.1.0 (29-04-2023)

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
