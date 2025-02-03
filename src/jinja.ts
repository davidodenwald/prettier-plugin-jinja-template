export const Placeholder = {
	startToken: "#~",
	endToken: "~#",
};

interface BaseNode {
	id: string;
	content: string;
	preNewLines: number;
	originalText: string;
	index: number;
	length: number;
	nodes: { [id: string]: Node };
}

export interface RootNode extends BaseNode {
	type: "root";
}

type DelimiterChr = "" | "-" | "+";
export type Delimiter = {
	start: DelimiterChr;
	end: DelimiterChr;
};

export interface ExpressionNode extends BaseNode {
	type: "expression";
	delimiter: Delimiter;
}

export interface StatementNode extends BaseNode {
	type: "statement";
	keyword: string;
	delimiter: Delimiter;
}

export interface BlockNode extends BaseNode {
	type: "block";
	start: StatementNode;
	end: StatementNode;
	containsNewLines: boolean;
}

export interface CommentNode extends BaseNode {
	type: "comment";
}

export interface IgnoreNode extends BaseNode {
	type: "ignore";
}

export type Node =
	| RootNode
	| ExpressionNode
	| StatementNode
	| BlockNode
	| CommentNode
	| IgnoreNode;
