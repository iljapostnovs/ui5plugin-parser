import LineColumn = require("line-column");
export interface IAcornPosition {
	line: number,
	column: number
}

export class PositionAdapter {
	static offsetToPosition(content: string, position: number) {
		const lineColumn = LineColumn(content).fromIndex(position);
		return lineColumn;
	}

	static acornPositionToVSCodePosition(position: IAcornPosition) {
		return position;
	}
}