import { IUI5Parser } from "../../../../parser/abstraction/IUI5Parser";
import { AbstractBaseClass } from "../AbstractBaseClass";

export class EmptyJSClass extends AbstractBaseClass {
	constructor(className: string, parser: IUI5Parser) {
		super(className, parser);
		this.classExists = false;
	}
}
