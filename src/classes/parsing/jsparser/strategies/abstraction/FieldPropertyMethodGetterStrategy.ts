import { IUI5Parser } from "../../../../../IUI5Parser";
import { TextDocument } from "../../../abstraction/TextDocument";
import { IFieldsAndMethods } from "../../../factory/IUIClassFactory";
import { AbstractCustomClass } from "../../../ui5class/AbstractCustomClass";
export abstract class FieldPropertyMethodGetterStrategy {
	protected readonly parser: IUI5Parser<AbstractCustomClass>;
	constructor(parser: IUI5Parser<AbstractCustomClass>) {
		this.parser = parser;
	}
	abstract getFieldsAndMethods(document: TextDocument, position: number): IFieldsAndMethods | undefined;

	protected _filterFieldsAndMethodsAccordingToAccessLevelModifiers(
		fieldsAndMethods: IFieldsAndMethods,
		visibility = ["public"]
	) {
		if (fieldsAndMethods?.fields) {
			fieldsAndMethods.fields = fieldsAndMethods.fields.filter(field => visibility.includes(field.visibility));

			if (visibility.includes("private")) {
				fieldsAndMethods.fields = fieldsAndMethods.fields.filter(
					field => field.visibility !== "private" || field.owner === fieldsAndMethods.className
				);
			}
		}
		if (fieldsAndMethods?.methods) {
			fieldsAndMethods.methods = fieldsAndMethods.methods.filter(method =>
				visibility.includes(method.visibility)
			);
			if (visibility.includes("private")) {
				fieldsAndMethods.methods = fieldsAndMethods.methods.filter(
					method => method.visibility !== "private" || method.owner === fieldsAndMethods.className
				);
			}
		}
	}
}
