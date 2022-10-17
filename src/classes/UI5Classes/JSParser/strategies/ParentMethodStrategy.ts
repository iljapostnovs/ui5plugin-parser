import { FieldPropertyMethodGetterStrategy } from "./abstraction/FieldPropertyMethodGetterStrategy";
import { CustomUIClass } from "../../UI5Parser/UIClass/CustomUIClass";
import { ReusableMethods } from "../../../utils/ReusableMethods";
import { TextDocument } from "../../abstraction/TextDocument";
import { UI5Parser } from "../../../../UI5Parser";
import { IFieldsAndMethods } from "../../interfaces/IUIClassFactory";
import { AbstractUI5Parser } from "../../../../IUI5Parser";
export class ParentMethodStrategy extends FieldPropertyMethodGetterStrategy {
	getFieldsAndMethods(document: TextDocument, position: number) {
		let fieldsAndMethods: IFieldsAndMethods | undefined;
		const className = AbstractUI5Parser.getInstance(UI5Parser).fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = AbstractUI5Parser.getInstance(UI5Parser).classFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass && UIClass.parentClassNameDotNotation) {
				const positionAtClassBodyPropertyName = ReusableMethods.getIfPositionIsInPropertyName(
					UIClass,
					position
				);
				if (positionAtClassBodyPropertyName) {
					const fields = AbstractUI5Parser.getInstance(UI5Parser).classFactory.getClassFields(
						UIClass.parentClassNameDotNotation,
						false
					);
					const methods = AbstractUI5Parser.getInstance(UI5Parser).classFactory.getClassMethods(
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
