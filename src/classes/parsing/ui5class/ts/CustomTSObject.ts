import * as path from "path";
import {
	MethodDeclaration,
	ObjectLiteralElementLike,
	ObjectLiteralExpression,
	ParameterDeclaration,
	PropertyAssignment,
	SourceFile,
	TypeChecker
} from "ts-morph";
import * as ts from "typescript";
import ParserPool from "../../../../parser/pool/ParserPool";
import { UI5TSParser } from "../../../../parser/UI5TSParser";
import {
	AbstractCustomClass,
	ICustomClassField,
	ICustomClassMethod,
	IUIDefine,
	IViewsAndFragmentsCache
} from "../AbstractCustomClass";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ICustomClassTSObjectField extends ICustomClassField<PropertyAssignment> {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ICustomClassTSObjectMethod extends ICustomClassMethod<PropertyAssignment | MethodDeclaration> {}

export class CustomTSObject extends AbstractCustomClass<
	ObjectLiteralElementLike,
	ObjectLiteralElementLike,
	ObjectLiteralExpression
> {
	parentClassNameDotNotation = "";
	readonly typeChecker: TypeChecker;
	protected _fillIsAbstract(): void {
		throw new Error("Method not implemented.");
	}
	protected _getUIDefine(): IUIDefine<any>[] {
		throw new Error("Method not implemented.");
	}
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	protected _fillParentClassName(): void {}
	methods: ICustomClassTSObjectMethod[] = [];
	fields: ICustomClassTSObjectField[] = [];
	fsPath: string;
	readonly classText: string;
	UIDefine: IUIDefine[] = [];
	relatedViewsAndFragments?: IViewsAndFragmentsCache[];
	readonly node: ObjectLiteralExpression;
	private readonly _sourceFile: SourceFile;
	constructor(objectLiteralExpression: ObjectLiteralExpression, parser: UI5TSParser, typeChecker: TypeChecker) {
		const sourceFile = objectLiteralExpression.getSourceFile();
		const className = parser.fileReader.getClassNameFromPath(sourceFile.compilerNode.fileName);
		super(className ?? "", parser);
		this.typeChecker = typeChecker;
		this.classText = sourceFile.getFullText();
		this._sourceFile = sourceFile;
		this.fsPath = path.resolve(sourceFile.compilerNode.fileName);
		this.node = objectLiteralExpression;

		this._fillUI5Metadata(undefined, false);
	}

	loadTypes() {
		this._fillUI5Metadata(undefined, true);
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
			const manifest = ParserPool.getManifestForClass(this.className);

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

	protected _fillFields(metadata?: any, fillTypes = false) {
		const properties = this.node.getProperties();

		const propertyAssignments = properties
			.filter(field => field.isKind(ts.SyntaxKind.PropertyAssignment))
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			.map(field => field.asKind(ts.SyntaxKind.PropertyAssignment)!);

		const fields = propertyAssignments.filter(
			field =>
				!field.getInitializer()?.isKind(ts.SyntaxKind.FunctionExpression) &&
				!field.getInitializer()?.isKind(ts.SyntaxKind.ArrowFunction)
		);

		const UIFields: ICustomClassTSObjectField[] = fields.map(field => {
			const positionStart = this._sourceFile.getLineAndColumnAtPos(field.getNameNode().getStart());
			const positionEnd = this._sourceFile.getLineAndColumnAtPos(field.getNameNode().getEnd());

			let type = fillTypes ? field.getType().getText() : "any";
			type = this._modifyType(type);
			return {
				ui5ignored: false,
				owner: this.className,
				static: true,
				abstract: false,
				type: type,
				visibility: "public",
				name: field.getName(),
				deprecated: false,
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

	protected _fillMethods(metadata?: any, fillTypes = false) {
		const properties = this.node.getProperties();

		const propertyAssignments = properties
			.filter(field => field.isKind(ts.SyntaxKind.PropertyAssignment))
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			.map(field => field.asKind(ts.SyntaxKind.PropertyAssignment)!);

		const functions = propertyAssignments.filter(
			field =>
				field.getInitializer()?.isKind(ts.SyntaxKind.FunctionExpression) ||
				field.getInitializer()?.isKind(ts.SyntaxKind.ArrowFunction)
		);

		const methods = properties
			.filter(field => field.isKind(ts.SyntaxKind.MethodDeclaration))
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			.map(field => field.asKind(ts.SyntaxKind.MethodDeclaration)!);

		const UIMethods: ICustomClassTSObjectMethod[] = [...methods, ...functions].map(method => {
			const positionStart = this._sourceFile.getLineAndColumnAtPos(method.getNameNode().getStart());
			const positionEnd = this._sourceFile.getLineAndColumnAtPos(method.getNameNode().getEnd());

			let returnType = "void";
			let parameters: ParameterDeclaration[] = [];
			if (method.isKind(ts.SyntaxKind.MethodDeclaration)) {
				returnType = fillTypes ? method.getReturnType().getText() : "void";
				parameters = method.getParameters();
			} else if (method.isKind(ts.SyntaxKind.PropertyAssignment)) {
				const myFunction =
					method.getInitializer()?.asKind(ts.SyntaxKind.FunctionExpression) ??
					method.getInitializer()?.asKind(ts.SyntaxKind.ArrowFunction);

				parameters = myFunction?.getParameters() ?? [];
				returnType = fillTypes ? myFunction?.getReturnType().getText() ?? "void" : "void";
			}
			returnType = this._modifyType(returnType);

			return {
				ui5ignored: false,
				owner: this.className,
				static: true,
				abstract: false,
				returnType: returnType,
				visibility: "public",
				params: parameters.map(param => {
					return {
						name: param.getName(),
						type: fillTypes ? this._modifyType(param.getType().getText()) ?? "any" : "any",
						description: "",
						isOptional: false
					};
				}),
				name: method.getName(),
				position: method.getStart(),
				deprecated: false,
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

		return UIMethods;
	}

	private _modifyType(returnType: string): string {
		if (/import\(".*?"\).default/.test(returnType)) {
			const path = /(?<=import\(").*?(?="\).default)/.exec(returnType)?.[0];
			const UI5Type = path?.startsWith("sap/")
				? path.replace(/\//g, ".")
				: path
				? this.parser.fileReader.getClassNameFromPath(path)
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

	protected _fillUI5Metadata(classInfo?: any, fillTypes = false) {
		this._fillUIDefine();
		this.methods = this._fillMethods(undefined, fillTypes);
		this.fields = this._fillFields(undefined, fillTypes);
	}

	protected _fillInterfaces() {
		return [];
	}

	protected _fillAggregations() {
		return [];
	}

	protected _fillEvents() {
		return [];
	}

	protected _fillProperties() {
		return [];
	}

	protected _fillAssociations() {
		return [];
	}
}
