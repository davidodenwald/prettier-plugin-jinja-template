export const Placeholder = {
	startToken: "#~",
	endToken: "~#",
};

export interface Node {
	id: string;
	type: "root" | "expression" | "statement" | "block" | "comment" | "ignore";
	content: string;
	preNewLines: number;
	originalText: string;
	index: number;
	length: number;
	nodes: { [id: string]: Node };
}

type DelimiterChr = "" | "-" | "+";
export type Delimiter = {
	start: DelimiterChr;
	end: DelimiterChr;
};

export interface Expression extends Node {
	type: "expression";
	delimiter: Delimiter;
}

export interface Statement extends Node {
	type: "statement";
	keyword: string;
	delimiter: Delimiter;
}

export interface Block extends Node {
	type: "block";
	start: Statement;
	end: Statement;
	containsNewLines: boolean;
}
