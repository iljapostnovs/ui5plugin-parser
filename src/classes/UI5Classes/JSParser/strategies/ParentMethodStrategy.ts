import { IFieldsAndMethods } from "../../UIClassFactory";
import { FieldPropertyMethodGetterStrategy } from "./abstraction/FieldPropertyMethodGetterStrategy";
import { CustomUIClass } from "../../UI5Parser/UIClass/CustomUIClass";
import { ReusableMethods } from "../../../utils/ReusableMethods";
import { TextDocument } from "../../abstraction/TextDocument";
import { UI5Plugin } from "../../../../UI5Plugin";
export class ParentMethodStrategy extends FieldPropertyMethodGetterStrategy {
	getFieldsAndMethods(document: TextDocument, position: number) {
		let fieldsAndMethods: IFieldsAndMethods | undefined;
		const className = UI5Plugin.getInstance().fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = UI5Plugin.getInstance().classFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass && UIClass.parentClassNameDotNotation) {
				const positionAtClassBodyPropertyName = ReusableMethods.getIfPositionIsInPropertyName(UIClass, position);
				if (positionAtClassBodyPropertyName) {
					const fields = UI5Plugin.getInstance().classFactory.getClassFields(UIClass.parentClassNameDotNotation, false);
					const methods = UI5Plugin.getInstance().classFactory.getClassMethods(UIClass.parentClassNameDotNotation, false);
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