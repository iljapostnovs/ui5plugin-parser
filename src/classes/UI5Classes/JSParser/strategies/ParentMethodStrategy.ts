import { IFieldsAndMethods, UIClassFactory } from "../../UIClassFactory";
import { FieldPropertyMethodGetterStrategy } from "./abstraction/FieldPropertyMethodGetterStrategy";
import { FileReader } from "../../../utils/FileReader";
import { CustomUIClass } from "../../UI5Parser/UIClass/CustomUIClass";
import { ReusableMethods } from "../../../utils/ReusableMethods";
import { TextDocument } from "../../abstraction/TextDocument";
export class ParentMethodStrategy extends FieldPropertyMethodGetterStrategy {
	getFieldsAndMethods(document: TextDocument, position: number) {
		let fieldsAndMethods: IFieldsAndMethods | undefined;
		const className = FileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = UIClassFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass && UIClass.parentClassNameDotNotation) {
				const positionAtClassBodyPropertyName = ReusableMethods.getIfPositionIsInPropertyName(UIClass, position);
				if (positionAtClassBodyPropertyName) {
					const fields = UIClassFactory.getClassFields(UIClass.parentClassNameDotNotation, false);
					const methods = UIClassFactory.getClassMethods(UIClass.parentClassNameDotNotation, false);
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