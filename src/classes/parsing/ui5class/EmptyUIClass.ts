import { IUI5Parser } from "../../../parser/IUI5Parser";
import { AbstractUIClass } from "./AbstractUIClass";

export class EmptyUIClass extends AbstractUIClass {
	constructor(className: string, parser: IUI5Parser) {
		super(className, parser);
	}
}
