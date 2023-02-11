import { IUI5Parser } from "../../../../parser/abstraction/IUI5Parser";
import { AbstractJSClass } from "./AbstractJSClass";

export class EmptyJSClass extends AbstractJSClass {
	constructor(className: string, parser: IUI5Parser) {
		super(className, parser);
	}
}
