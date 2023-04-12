import { CustomJSClass, ICustomClassJSMethod } from "./parsing/ui5class/js/CustomJSClass";
import { TextDocument } from "./parsing/util/textdocument/TextDocument";
import { TextDocumentTransformer } from "./parsing/util/textdocument/TextDocumentTransformer";

export class ReusableMethods {
	private readonly _documentTransformer: TextDocumentTransformer;
	constructor(documentTransformer: TextDocumentTransformer) {
		this._documentTransformer = documentTransformer;
	}

	getPositionOfTheLastUIDefine(document: TextDocument) {
		let position: number | undefined;
		const UIClass = this._documentTransformer.toCustomUIClass(document);
		if (UIClass && UIClass instanceof CustomJSClass) {
			const mainFunction = UIClass.fileContent?.body[0]?.expression;
			const definePaths: any[] = mainFunction?.arguments[0]?.elements;

			let insertPosition = 0;
			if (definePaths?.length) {
				const lastDefinePath = definePaths[definePaths.length - 1];
				insertPosition = lastDefinePath.end;
			} else {
				insertPosition = mainFunction?.arguments[0]?.start;
			}
			if (insertPosition) {
				position = insertPosition;
			}
		}

		return position;
	}

	getIfPositionIsInTheLastOrAfterLastMember(UIClass: CustomJSClass, position: number) {
		const currentMethod = UIClass.methods.find(
			method => method.node?.start < position && method.node?.end > position
		);
		const positionIsInMethod = !!currentMethod;
		const positionIsAfterLastMethod = positionIsInMethod
			? false
			: this._getIfPositionIsAfterLastMember(UIClass, position);

		return positionIsInMethod || positionIsAfterLastMethod;
	}

	private _getIfPositionIsAfterLastMember(UIClass: CustomJSClass, position: number) {
		let isPositionAfterLastMethod = false;
		const properties = UIClass.acornClassBody?.properties || [];
		const lastProperty = properties[properties.length - 1];
		if (lastProperty) {
			isPositionAfterLastMethod = lastProperty.end <= position && UIClass.acornClassBody.end > position;
		}

		return isPositionAfterLastMethod;
	}

	getIfMethodIsLastOne(UIClass: CustomJSClass, method: ICustomClassJSMethod) {
		let currentMethodIsLastMethod = false;
		const propertyValues = UIClass.acornClassBody?.properties?.map((node: any) => node.value);
		if (propertyValues) {
			const methodsInClassBody = UIClass.methods.filter(method => {
				return propertyValues.includes(method.node);
			});
			currentMethodIsLastMethod = methodsInClassBody.indexOf(method) === methodsInClassBody.length - 1;
		}

		return currentMethodIsLastMethod;
	}

	getIfPositionIsInPropertyName(UIClass: CustomJSClass, position: number) {
		let bPositionIsInPropertyName = true;
		const positionIsBetweenProperties = !!UIClass.acornClassBody.properties?.find((node: any, index: number) => {
			let correctNode = false;
			const nextNode = UIClass.acornClassBody.properties[index + 1];
			if (nextNode && node.end < position && nextNode.start > position) {
				correctNode = true;
			}

			return correctNode;
		});

		const positionIsInPropertyKey = !!UIClass.acornClassBody.properties?.find((node: any) => {
			return node.key?.start <= position && node.key?.end >= position;
		});

		bPositionIsInPropertyName = positionIsBetweenProperties || positionIsInPropertyKey;

		return bPositionIsInPropertyName;
	}
}
