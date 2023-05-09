import { Parser } from "prettier";
import {
	Delimiter,
	Node,
	Placeholder,
	Expression,
	Statement,
	Block,
	nonClosingStatements,
} from "./jinja";

const NOT_FOUND = -1;

const regex =
	/(?<node>{{(?<startDelimiterEx>[-+]?)\s*(?<expression>'([^']|\\')*'|"([^"]|\\")*"|[\S\s]*?)\s*(?<endDelimiterEx>[-+]?)}}|{%(?<startDelimiter>[-+]?)\s*(?<statement>(?<keyword>\w+)('([^']|\\')*'|"([^"]|\\")*"|[\S\s])*?)\s*(?<endDelimiter>[-+]?)%}|(?<comment>{#[\S\s]*?#})|(?<scriptBlock><(script)((?!<)[\s\S])*>((?!<\/script)[\s\S])*?{{[\s\S]*?<\/(script)>)|(?<styleBlock><(style)((?!<)[\s\S])*>((?!<\/style)[\s\S])*?{{[\s\S]*?<\/(style)>)|(?<ignoreBlock><!-- prettier-ignore-start -->[\s\S]*<!-- prettier-ignore-end -->))/;

export const parse: Parser<Node>["parse"] = (text) => {
	const statementStack: Statement[] = [];

	const root: Node = {
		id: "0",
		type: "root" as const,
		content: text,
		preNewLines: 0,
		originalText: text,
		index: 0,
		length: 0,
		nodes: {},
	};

	const generatePlaceholder = placeholderGenerator(text);

	let match;
	let i = 0;
	while ((match = text.slice(i).match(regex)) !== null) {
		if (!match.groups || match.index === undefined) {
			continue;
		}
		const matchLength = match[0].length;

		// skip script and style blocks
		if (match.groups.scriptBlock || match.groups.styleBlock) {
			i += match.index + matchLength;
			continue;
		}

		const matchText = match.groups.node;
		const expression = match.groups.expression;
		const statement = match.groups.statement;
		const ignoreBlock = match.groups.ignoreBlock;
		const comment = match.groups.comment;

		if (!matchText && !expression && !statement && !ignoreBlock && !comment) {
			continue;
		}
		const placeholder = generatePlaceholder();

		const emptyLinesBetween = text.slice(i, i + match.index).match(/^\s+$/) || [
			"",
		];
		const preNewLines = emptyLinesBetween.length
			? emptyLinesBetween[0].split("\n").length - 1
			: 0;

		const node = {
			id: placeholder,
			preNewLines,
			originalText: matchText,
			index: match.index + i,
			length: matchText.length,
			nodes: root.nodes,
		};

		if (comment || ignoreBlock) {
			root.content = root.content.replace(matchText, placeholder);
			root.nodes[node.id] = {
				...node,
				type: comment ? "comment" : "ignore",
				content: comment || ignoreBlock,
			};
		}

		if (expression) {
			const delimiter = (match.groups.startDelimiterEx ||
				match.groups.endDelimiterEx) as Delimiter;

			root.content = root.content.replace(matchText, placeholder);
			root.nodes[node.id] = {
				...node,
				type: "expression",
				content: expression,
				delimiter,
			} as Expression;
		}

		if (statement) {
			const keyword = match.groups.keyword;
			const delimiter = (match.groups.startDelimiter ||
				match.groups.endDelimiter) as Delimiter;

			if (nonClosingStatements.includes(keyword)) {
				root.content = root.content.replace(matchText, placeholder);
				root.nodes[node.id] = {
					...node,
					type: "statement",
					content: statement,
					keyword,
					delimiter,
				} as Statement;
			} else if (!keyword.startsWith("end")) {
				root.nodes[node.id] = {
					...node,
					type: "statement",
					content: statement,
					keyword,
					delimiter,
				} as Statement;
				statementStack.push(root.nodes[placeholder] as Statement);
			} else {
				let start: Statement | undefined;
				while (!start) {
					start = statementStack.pop();

					if (!start) {
						throw new Error(
							`No opening statement found for closing statement "${statement}".`
						);
					}

					const startKeyword = keyword.replace("end", "");
					if (startKeyword !== start.keyword) {
						if (start.keyword === "set") {
							root.content = root.content.replace(start.originalText, start.id);
							start = undefined;
							continue;
						}

						throw new Error(
							`Closing statement "${statement}" doesn't match Opening Statement "${start.content}".`
						);
					}
				}

				const end = {
					...node,
					type: "statement",
					content: statement,
					keyword,
					delimiter,
				} as Statement;
				root.nodes[end.id] = end;

				const blockText = root.content.slice(
					root.content.indexOf(start.originalText),
					root.content.indexOf(end.originalText) + end.length
				);

				const originalText = text.slice(start.index, end.index + end.length);
				const block = {
					id: generatePlaceholder(),
					type: "block",
					start: start,
					end: end,
					content: blockText.slice(start.length, blockText.length - end.length),
					preNewLines: start.preNewLines,
					containsNewLines: originalText.search("\n") !== NOT_FOUND,
					originalText,
					index: start.index,
					length: end.index + end.length - start.index,
					nodes: root.nodes,
				} as Block;
				root.nodes[block.id] = block;

				root.content = root.content.replace(blockText, block.id);
			}
		}

		i += match.index + matchLength;
	}

	for (const stmt of statementStack) {
		if (stmt.keyword === "set") {
			root.content = root.content.replace(stmt.originalText, stmt.id);
		} else {
			throw new Error(
				`No closing statement found for opening statement "${stmt.content}".`
			);
		}
	}

	return root;
};

const placeholderGenerator = (text: string) => {
	let id = 0;

	return (): string => {
		while (true) {
			id++;

			const placeholder = Placeholder.startToken + id + Placeholder.endToken;
			if (!text.includes(placeholder)) {
				return placeholder;
			}
		}
	};
};
