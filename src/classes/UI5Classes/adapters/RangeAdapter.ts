import { IAcornPosition, PositionAdapter } from "./PositionAdapter";

export interface IAcornLocation {
	start: IAcornPosition,
	end: IAcornPosition
}

export interface IAcornRange {
	from: IAcornLocation,
	to: IAcornLocation
}

export class RangeAdapter {

	static acornPositionsToVSCodeRange(positionBegin: IAcornPosition, positionEnd: IAcornPosition): IAcornRange {
		const vscodePositionBegin = PositionAdapter.acornPositionToVSCodePosition(positionBegin);
		const vscodePositionEnd = PositionAdapter.acornPositionToVSCodePosition(positionEnd);
		return new vscode.Range(vscodePositionBegin, vscodePositionEnd);
	}

	static acornLocationToVSCodeRange(location: IAcornLocation): IAcornRange {
		const vscodePositionBegin = PositionAdapter.acornPositionToVSCodePosition(location.start);
		const vscodePositionEnd = PositionAdapter.acornPositionToVSCodePosition(location.end);
		return new vscode.Range(vscodePositionBegin, vscodePositionEnd);
	}
}