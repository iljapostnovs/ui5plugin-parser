import { ClassDeclaration, MethodDeclaration, PropertyDeclaration, SourceFile } from "ts-morph";
import * as ts from "typescript";
import * as Hjson from "hjson";
import * as path from "path";
import {
	AbstractCustomClass,
	ICustomClassField,
	ICustomClassMethod,
	IUIDefine,
	IViewsAndFragmentsCache
} from "./AbstractCustomClass";
import { UI5Parser } from "../../../../UI5Parser";
import { IUIAssociation, IUIProperty } from "./AbstractUIClass";
import { AbstractUI5Parser } from "../../../../IUI5Parser";
import { UI5TSParser } from "../../../../UI5TSParser";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ICustomClassTSField extends ICustomClassField<PropertyDeclaration> {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ICustomClassTSMethod extends ICustomClassMethod<MethodDeclaration> {}

export class CustomTSClass extends AbstractCustomClass<
	MethodDeclaration,
	PropertyDeclaration,
	ClassDeclaration,
	ClassInfo
> {
	parentClassNameDotNotation = "";
	protected _fillIsAbstract(): void {
		throw new Error("Method not implemented.");
	}
	protected _getUIDefine(): IUIDefine<any>[] {
		throw new Error("Method not implemented.");
	}
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	protected _fillParentClassName(): void {}
	methods: ICustomClassTSMethod[] = [];
	fields: ICustomClassTSField[] = [];

	fsPath: string;
	readonly classText: string;
	UIDefine: IUIDefine[] = [];
	relatedViewsAndFragments?: IViewsAndFragmentsCache[];
	readonly node: ClassDeclaration;
	private readonly _sourceFile: SourceFile;
	readonly typeChecker: ts.TypeChecker;
	constructor(classDeclaration: ClassDeclaration, sourceFile: SourceFile, typeChecker: ts.TypeChecker) {
		const className = AbstractUI5Parser.getInstance(UI5TSParser).fileReader.getClassNameFromPath(
			sourceFile.compilerNode.fileName
		);
		super(className ?? "");

		this.typeChecker = typeChecker;

		const heritageClause = classDeclaration.compilerNode.heritageClauses?.find(heritage => {
			return heritage.token == ts.SyntaxKind.ExtendsKeyword;
		});
		if (heritageClause) {
			const parentType = typeChecker.getTypeFromTypeNode(heritageClause.types[0]);
			const parentSymbol = parentType.getSymbol();
			const parentName = parentSymbol && typeChecker.getFullyQualifiedName(parentSymbol);
			const [parentModuleNameQuoted] = parentName?.split(".") ?? [];
			const parentModulePath = parentModuleNameQuoted?.substring(1, parentModuleNameQuoted.length - 1);
			if (parentModulePath?.startsWith("sap/")) {
				this.parentClassNameDotNotation = parentModulePath.replace(/\/|\\/g, ".");
			} else if (parentModulePath) {
				const parentClassName = AbstractUI5Parser.getInstance(UI5TSParser).fileReader.getClassNameFromPath(parentModulePath);
				this.parentClassNameDotNotation = parentClassName ?? "";
			}
		}

		this.classText = sourceFile.getFullText();

		this._sourceFile = sourceFile;
		this.fsPath = sourceFile.compilerNode.fileName;
		this.node = classDeclaration;
		this._fillUI5Metadata();
	}

	_fillUIDefine() {
		const importStatements = this._sourceFile.getImportDeclarations();

		this.UIDefine = importStatements.map(importStatement => {
			const modulePath = importStatement.getModuleSpecifier().getLiteralText();

			return {
				path: modulePath,
				className: modulePath.split("/").pop() ?? "",
				classNameDotNotation: this._generateClassNameDotNotationFor(modulePath),
				start: importStatement.getStart(),
				end: importStatement.getEnd(),
				acornNode: importStatement
			};
		});
	}

	private _generateClassNameDotNotationFor(moduleNameSlash: string) {
		let className = moduleNameSlash.replace(/\//g, ".");

		if (moduleNameSlash?.startsWith(".")) {
			const manifest = AbstractUI5Parser.getInstance(UI5Parser).fileReader.getManifestForClass(this.className);

			if (manifest && this.fsPath) {
				const normalizedManifestPath = path.normalize(manifest.fsPath);
				const importClassPath = path.resolve(path.dirname(this.fsPath), moduleNameSlash);
				const relativeToManifest = path.relative(normalizedManifestPath, importClassPath);
				const pathRelativeToManifestDotNotation = relativeToManifest.split(path.sep).join(".");
				className = `${manifest.componentName}.${pathRelativeToManifestDotNotation}`;
			}
		}

		if (className.endsWith(".controller")) {
			className = className.substring(0, className.length - ".controller".length);
		}

		return className;
	}

	protected _fillFields() {
		const fields: PropertyDeclaration[] = this.node.getProperties();

		const UIFields: ICustomClassTSField[] = fields.map(field => {
			const jsDocs = field.getJsDocs();
			const ui5IgnoreDoc = jsDocs.some(jsDoc => jsDoc.getTags().some(tag => tag.getTagName() === "ui5ignore"));
			const positionStart = this._sourceFile.getLineAndColumnAtPos(field.getNameNode().getStart());
			const positionEnd = this._sourceFile.getLineAndColumnAtPos(field.getNameNode().getEnd());

			let type = field.getType().getText();
			type = this._modifyType(type);
			return {
				ui5ignored: ui5IgnoreDoc,
				owner: this.className,
				static: field.isStatic(),
				abstract: field.isAbstract(),
				type: type,
				visibility:
					field
						.getModifiers()
						.find(modifier =>
							[
								ts.SyntaxKind.ProtectedKeyword,
								ts.SyntaxKind.PrivateKeyword,
								ts.SyntaxKind.PublicKeyword
							].includes(modifier.getKind())
						)
						?.getText() ?? "public",
				name: field.getName(),
				deprecated: jsDocs.some(jsDoc => ts.isJSDocDeprecatedTag(jsDoc.compilerNode)),
				description: "",
				isEventHandler: false,
				node: field,
				mentionedInTheXMLDocument: false,
				loc: {
					start: {
						line: positionStart.line,
						column: positionStart.column - 1
					},
					end: {
						line: positionEnd.line,
						column: positionEnd.column - 1
					}
				}
			};
		});

		return UIFields;
	}

	protected _fillMethods() {
		const constructorDeclarations = this.node.getConstructors();
		const methods: MethodDeclaration[] = this.node.getMethods();

		const UIMethods: ICustomClassTSMethod[] = methods.map(method => {
			const jsDocs = method.getJsDocs();
			const ui5IgnoreDoc = jsDocs.some(jsDoc => jsDoc.getTags().some(tag => tag.getTagName() === "ui5ignore"));
			const positionStart = this._sourceFile.getLineAndColumnAtPos(method.getNameNode().getStart());
			const positionEnd = this._sourceFile.getLineAndColumnAtPos(method.getNameNode().getEnd());

			let returnType = method.getReturnType().getText();
			returnType = this._modifyType(returnType);
			return {
				ui5ignored: !!ui5IgnoreDoc,
				owner: this.className,
				static: method.isStatic(),
				abstract: method.isAbstract(),
				returnType: returnType ?? "void",
				visibility:
					method
						.getModifiers()
						.find(modifier =>
							[
								ts.SyntaxKind.ProtectedKeyword,
								ts.SyntaxKind.PrivateKeyword,
								ts.SyntaxKind.PublicKeyword
							].includes(modifier.getKind())
						)
						?.getText() ?? "public",
				params: method.getParameters().map(param => {
					return {
						name: param.getName(),
						type: this._modifyType(param.getType().getText()) ?? "any",
						description: "",
						isOptional: false
					};
				}),
				name: method.getName(),
				position: method.getStart(),
				deprecated: jsDocs.some(jsDoc => ts.isJSDocDeprecatedTag(jsDoc.compilerNode)),
				description: "",
				isEventHandler: false,
				node: method,
				loc: {
					start: {
						line: positionStart.line,
						column: positionStart.column - 1
					},
					end: {
						line: positionEnd.line,
						column: positionEnd.column - 1
					}
				},
				mentionedInTheXMLDocument: false
			};
		});

		const constructors: ICustomClassTSMethod[] = constructorDeclarations.map(constructor => {
			const jsDocs = constructor.getJsDocs();
			const ui5IgnoreDoc = jsDocs.some(jsDoc => jsDoc.getTags().some(tag => tag.getTagName() === "ui5ignore"));
			const positionStart = this._sourceFile.getLineAndColumnAtPos(constructor.getStart());
			const positionEnd = this._sourceFile.getLineAndColumnAtPos(constructor.getEnd());

			const method: ICustomClassTSMethod = {
				ui5ignored: !!ui5IgnoreDoc,
				owner: this.className,
				static: false,
				abstract: false,
				returnType: this._modifyType(constructor.getReturnType().getText()) ?? "void",
				visibility:
					constructor
						.getModifiers()
						.find(modifier =>
							[
								ts.SyntaxKind.ProtectedKeyword,
								ts.SyntaxKind.PrivateKeyword,
								ts.SyntaxKind.PublicKeyword
							].includes(modifier.getKind())
						)
						?.getText() ?? "public",
				params: constructor.getParameters().map(param => {
					return {
						name: param.getName(),
						type: this._modifyType(param.getType().getText()) ?? "any",
						description: "",
						isOptional: false
					};
				}),
				name: "constructor",
				position: constructor.getStart(),
				node: constructor as any,
				deprecated: jsDocs.some(jsDoc => ts.isJSDocDeprecatedTag(jsDoc.compilerNode)),
				description: "",
				isEventHandler: false,
				loc: {
					start: {
						line: positionStart.line,
						column: positionStart.column - 1
					},
					end: {
						line: positionEnd.line,
						column: positionEnd.column - 1
					}
				},
				mentionedInTheXMLDocument: false
			};
			return method;
		});

		return UIMethods.concat(constructors);
	}

	private _modifyType(returnType: string): string {
		if (/import\(".*?"\).default/.test(returnType)) {
			const path = /(?<=import\(").*?(?="\).default)/.exec(returnType)?.[0];
			const UI5Type = path
				? AbstractUI5Parser.getInstance(UI5Parser).fileReader.getClassNameFromPath(path)
				: undefined;
			if (UI5Type) {
				returnType = UI5Type;
			}
		}
		if (/import\(".*?"\)\.[a-zA-Z|$]*/.test(returnType)) {
			const className = /(?<=import\(".*?"\)\.)[a-zA-Z|$]*/.exec(returnType)?.[0];
			if (className) {
				returnType = className;
			}
		}

		return returnType;
	}

	protected _fillUI5Metadata() {
		this.methods = this._fillMethods();
		this.fields = this._fillFields();
		this._fillUIDefine();

		const metadata = this.node.getProperty("metadata");

		const metadataText = metadata?.getInitializer()?.getText();
		if (metadataText) {
			let metadataObject: ClassInfo;
			try {
				metadataObject = Hjson.parse(metadataText) as ClassInfo;
				this.properties = this._fillProperties(metadataObject);
				this.aggregations = this._fillAggregations(metadataObject);
				this.events = this._fillEvents(metadataObject);
				this.associations = this._fillAssociations(metadataObject);
				this.interfaces = this._fillInterfaces(metadataObject);
			} catch (error: any) {
				console.error(`Couldn't parse metadata: ${error.message}`);
				return;
			}
		}
	}

	protected _fillInterfaces(metadata: ClassInfo) {
		const metadataInterfaces = metadata.interfaces;
		if (!metadataInterfaces) {
			return [];
		}

		return metadataInterfaces;
	}

	protected _fillAggregations(metadata: ClassInfo) {
		const metadataAggregations = metadata.aggregations;
		if (!metadataAggregations) {
			return [];
		}
		return Object.keys(metadataAggregations).map(sKey => {
			const aggregation = metadataAggregations[sKey];

			return {
				name: aggregation.name ?? sKey ?? "",
				type: aggregation.type ?? "any",
				multiple: aggregation.cardinality === "0..n",
				singularName: aggregation.singularName ?? aggregation.name ?? sKey ?? "",
				description: aggregation.deprecation ?? "",
				visibility: aggregation.visibility ?? "public",
				default: false
			};
		});
	}

	protected _fillEvents(metadata: ClassInfo) {
		const metadataEvents = metadata.events;
		if (!metadataEvents) {
			return [];
		}
		return Object.keys(metadataEvents).map(sKey => {
			const event = metadataEvents[sKey];

			return {
				name: event.name ?? sKey ?? "",
				description: "",
				visibility: event.visibility ?? "public",
				params: Object.keys(event.parameters ?? {}).map(sKey => {
					return {
						name: event.parameters[sKey].name ?? sKey,
						type: event.parameters[sKey].type
					};
				})
			};
		});
	}

	protected _fillProperties(metadata: ClassInfo) {
		const metadataProperties = metadata.properties;
		if (!metadataProperties) {
			return [];
		}
		const properties: IUIProperty[] = Object.keys(metadataProperties).map(sKey => {
			const property = metadataProperties[sKey];

			return {
				name: property.name ?? sKey ?? "",
				type: property.type ?? "any",
				visibility: property.visibility ?? "public",
				description: "",
				typeValues: this.generateTypeValues(property.type ?? "")
			};
		});

		return properties;
	}

	protected _fillAssociations(metadata: ClassInfo) {
		const metadataAssociations = metadata.associations;
		if (!metadataAssociations) {
			return [];
		}
		const associations: IUIAssociation[] = Object.keys(metadataAssociations).map(sKey => {
			const association = metadataAssociations[sKey];

			return {
				name: association.name ?? sKey ?? "",
				type: association.type ?? "any",
				multiple: association.cardinality === "0..n",
				singularName: association.singularName ?? association.name ?? sKey ?? "",
				description: association.deprecation ?? "",
				visibility: association.visibility ?? "public"
			};
		});

		return associations;
	}
}

interface APIMember {
	name: string;
	doc?: string;
	since?: string;
	deprecation?: string;
	experimental?: string;
	visibility?: string;
}

interface APIMemberWithMethods extends APIMember {
	methods: { [key: string]: string };
}

interface APIMemberWithType extends APIMember {
	type: string;
}

interface Property extends APIMemberWithMethods, APIMemberWithType {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	defaultValue?: any;
	bindable?: boolean;
}

interface Aggregation extends APIMemberWithMethods, APIMemberWithType {
	cardinality: "0..1" | "0..n";
	altTypes: [string];
	//dnd: any,
	singularName: string;
	bindable: boolean;
}
interface Association extends APIMemberWithMethods, APIMemberWithType {
	cardinality: "0..1" | "0..n";
	singularName: string;
}

interface UI5Event extends APIMemberWithMethods {
	allowPreventDefault: boolean;
	enableEventBubbling: boolean;
	parameters: { [key: string]: EventParameter };
}

interface EventParameter {
	name: string;
	doc: string;
	deprecation: string;
	since: string;
	experimental: string;
	type: string;
}

type SpecialSetting = APIMemberWithType;

interface ClassInfo {
	name?: string;
	interfaces?: string[];
	doc?: string;
	deprecation?: string;
	since?: string;
	experimental?: string;
	specialSettings?: { [key: string]: SpecialSetting };
	properties?: { [key: string]: Property };
	defaultProperty?: string;
	aggregations?: { [key: string]: Aggregation };
	defaultAggregation?: string;
	associations?: { [key: string]: Association };
	events?: { [key: string]: UI5Event };
	methods?: Record<string, unknown>; // TODO
	annotations?: Record<string, unknown>; // TODO
	designtime?: boolean | string;
	designTime?: boolean | string;
	stereotype?: null;
	metadataClass?: undefined;
	library?: string;
	//dnd: any,

	abstract?: boolean;
	final?: boolean;
}
