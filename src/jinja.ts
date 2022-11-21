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
}

export type Delimiter = "" | "-" | "+";

export interface Statement extends Node {
	type: "statement";
	keyword: Keyword;
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

export type Keyword =
	| "for"
	| "endfor"
	| "if"
	| "else"
	| "endif"
	| "macro"
	| "endmacro"
	| "call"
	| "endcall"
	| "filter"
	| "endfilter"
	| "set"
	| "endset"
	| "include"
	| "import"
	| "from"
	| "extends"
	| "block"
	| "endblock";

export const nonClosingStatements = [
	"else",
	"include",
	"import",
	"from",
	"extends",
];
