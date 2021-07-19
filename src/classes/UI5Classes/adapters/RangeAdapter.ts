import { IAcornPosition } from "./PositionAdapter";

export interface IAcornLocation {
	start: IAcornPosition,
	end: IAcornPosition
}

export interface IAcornRange {
	from: IAcornLocation,
	to: IAcornLocation
}

export class RangeAdapter {
}