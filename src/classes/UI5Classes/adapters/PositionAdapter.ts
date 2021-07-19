import LineColumn = require("line-column");
export interface IAcornPosition {
	line: number,
	column: number
}
interface LineColumnInfo {
	line: number;
	col: number;
}
export class PositionAdapter {
	static offsetToPosition(content: string, position: number): LineColumnInfo | null {
		const lineColumn = LineColumn(content).fromIndex(position);
		return lineColumn;
	}

	static acornPositionToVSCodePosition(position: IAcornPosition) {
		return position;
	}
}