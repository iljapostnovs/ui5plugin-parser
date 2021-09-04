import { FieldPropertyMethodGetterStrategy } from "./abstraction/FieldPropertyMethodGetterStrategy";
import { CustomUIClass } from "../../UI5Parser/UIClass/CustomUIClass";
import { ReusableMethods } from "../../../utils/ReusableMethods";
import { TextDocument } from "../../abstraction/TextDocument";
import { UI5Parser } from "../../../../UI5Parser";
import { IFieldsAndMethods } from "../../interfaces/IUIClassFactory";
export class ParentMethodStrategy extends FieldPropertyMethodGetterStrategy {
	getFieldsAndMethods(document: TextDocument, position: number) {
		let fieldsAndMethods: IFieldsAndMethods | undefined;
		const className = UI5Parser.getInstance().fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = UI5Parser.getInstance().classFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass && UIClass.parentClassNameDotNotation) {
				const positionAtClassBodyPropertyName = ReusableMethods.getIfPositionIsInPropertyName(UIClass, position);
				if (positionAtClassBodyPropertyName) {
					const fields = UI5Parser.getInstance().classFactory.getClassFields(UIClass.parentClassNameDotNotation, false);
					const methods = UI5Parser.getInstance().classFactory.getClassMethods(UIClass.parentClassNameDotNotation, false);
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