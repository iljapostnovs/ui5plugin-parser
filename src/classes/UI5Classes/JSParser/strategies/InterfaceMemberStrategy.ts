import { FieldPropertyMethodGetterStrategy } from "./abstraction/FieldPropertyMethodGetterStrategy";
import { CustomUIClass } from "../../UI5Parser/UIClass/CustomUIClass";
import { TextDocument } from "../../abstraction/TextDocument";
import { ReusableMethods } from "../../../utils/ReusableMethods";
import { UI5Parser } from "../../../../UI5Parser";
import { IFieldsAndMethods } from "../../interfaces/IUIClassFactory";
export class InterfaceMemberStrategy extends FieldPropertyMethodGetterStrategy {
	getFieldsAndMethods(document: TextDocument, position: number) {
		let fieldsAndMethods: IFieldsAndMethods | undefined;
		const className = UI5Parser.getInstance().fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = UI5Parser.getInstance().classFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass && UIClass.interfaces.length) {
				const positionAtClassBodyPropertyName = ReusableMethods.getIfPositionIsInPropertyName(UIClass, position);
				if (positionAtClassBodyPropertyName) {
					const fields = UIClass.interfaces.flatMap(theInterface => UI5Parser.getInstance().classFactory.getClassFields(theInterface, false));
					const methods = UIClass.interfaces.flatMap(theInterface => UI5Parser.getInstance().classFactory.getClassMethods(theInterface, false));
					fieldsAndMethods = {
						className: "__interface__",
						fields: fields,
						methods: methods
					};
					this._filterFieldsAndMethodsAccordingToAccessLevelModifiers(fieldsAndMethods, ["public", "protected"]);
				}
			}
		}

		return fieldsAndMethods;
	}
}