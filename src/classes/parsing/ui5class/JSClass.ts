import { IUI5Parser } from "../../../parser/abstraction/IUI5Parser";
import { AbstractUIClass, IUIField, IUIMethod } from "./AbstractUIClass";
import * as jsClassData from "./jsclassdata/JSClassData.json";

const jsClassDataCopy: any = jsClassData;
Object.keys(jsClassData).forEach(key => {
	jsClassDataCopy[key.toLowerCase()] = jsClassDataCopy[key];
});
const classData: { [key: string]: { methods: IUIMethod[]; fields: IUIField[] } } = jsClassData;
export class JSClass extends AbstractUIClass {
	constructor(className: string, parser: IUI5Parser) {
		super(className, parser);

		this.methods = classData[className]?.methods || [];
		this.fields = classData[className]?.fields || [];
	}
}
