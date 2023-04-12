import LineColumn = require("line-column");
export interface IAcornPosition {
	line: number;
	column: number;
}

export interface IPosition {
	line: number;
	column: number;
}

export class PositionAdapter {
	static offsetToPosition(content: string, position: number): IPosition | null {
		const lineColumn = LineColumn(content).fromIndex(position);
		return lineColumn && { column: lineColumn.col - 1, line: lineColumn.line - 1 };
	}

	static acornPositionToPosition(position: IAcornPosition): IPosition {
		return { column: position.column, line: position.line };
	}
}
