import { TextDocument } from "../../abstraction/TextDocument";
import { IFieldsAndMethods } from "../../interfaces/IUIClassFactory";
import { CustomUIClass } from "../../UI5Parser/UIClass/CustomUIClass";
import { FieldPropertyMethodGetterStrategy } from "./abstraction/FieldPropertyMethodGetterStrategy";
export class InterfaceMemberStrategy extends FieldPropertyMethodGetterStrategy {
	getFieldsAndMethods(document: TextDocument, position: number) {
		let fieldsAndMethods: IFieldsAndMethods | undefined;
		const className = this.parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this.parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass && UIClass.interfaces.length) {
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
