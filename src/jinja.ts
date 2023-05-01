export const Placeholder = {
	startToken: "#~",
	endToken: "~#",
};

export interface Node {
	id: string;
	type: "root" | "expression" | "statement" | "block" | "ignore";
	content: string;
	ownLine: boolean;
	originalText: string;
	index: number;
	length: number;
	nodes: { [id: string]: Node };
}

export interface Expression extends Node {
	type: "expression";
	delimiter: Delimiter;
}

export type Delimiter = "" | "-" | "+";

export interface Statement extends Node {
	type: "statement";
	keyword: string;
	delimiter: Delimiter;
}

export interface Block extends Node {
	type: "block";
	start: Statement;
	end: Statement;
}

export interface IgnoreBlock extends Node {
	type: "ignore";
}

export const nonClosingStatements = [
	"else",
	"elif",
	"include",
	"import",
	"from",
	"extends",
];
