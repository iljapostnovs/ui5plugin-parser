import { IFieldsAndMethods } from "../../factory/IUIClassFactory";
import { CustomJSClass } from "../../ui5class/js/CustomJSClass";
import { TextDocument } from "../../util/textdocument/TextDocument";
import { FieldPropertyMethodGetterStrategy } from "./abstraction/FieldPropertyMethodGetterStrategy";
export class InterfaceMemberStrategy extends FieldPropertyMethodGetterStrategy {
	getFieldsAndMethods(document: TextDocument, position: number) {
		let fieldsAndMethods: IFieldsAndMethods | undefined;
		const className = this.parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this.parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomJSClass && UIClass.interfaces.length) {
				const positionAtClassBodyPropertyName = this.parser.reusableMethods.getIfPositionIsInPropertyName(
					UIClass,
					position
				);
				if (positionAtClassBodyPropertyName) {
					const fields = UIClass.interfaces.flatMap(theInterface =>
						this.parser.classFactory.getClassFields(theInterface, false)
					);
					const methods = UIClass.interfaces.flatMap(theInterface =>
						this.parser.classFactory.getClassMethods(theInterface, false)
					);
					fieldsAndMethods = {
						className: "__interface__",
						fields: fields,
						methods: methods
					};
					this._filterFieldsAndMethodsAccordingToAccessLevelModifiers(fieldsAndMethods, [
						"public",
						"protected"
					]);
				}
			}
		}

		return fieldsAndMethods;
	}
}
