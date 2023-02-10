import { TextDocument } from "../../abstraction/TextDocument";
import { IFieldsAndMethods } from "../../interfaces/IUIClassFactory";
import { CustomUIClass } from "../../UI5Parser/UIClass/CustomUIClass";
import { FieldPropertyMethodGetterStrategy } from "./abstraction/FieldPropertyMethodGetterStrategy";
export class ParentMethodStrategy extends FieldPropertyMethodGetterStrategy {
	getFieldsAndMethods(document: TextDocument, position: number) {
		let fieldsAndMethods: IFieldsAndMethods | undefined;
		const className = this.parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this.parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass && UIClass.parentClassNameDotNotation) {
				const positionAtClassBodyPropertyName = this.parser.reusableMethods.getIfPositionIsInPropertyName(
					UIClass,
					position
				);
				if (positionAtClassBodyPropertyName) {
					const fields = this.parser.classFactory.getClassFields(
						UIClass.parentClassNameDotNotation,
						false
					);
					const methods = this.parser.classFactory.getClassMethods(
						UIClass.parentClassNameDotNotation,
						false
					);
					fieldsAndMethods = {
						className: "__override__",
						fields: fields,
						methods: methods
					};
				}
			}
		}

		return fieldsAndMethods;
	}
}
