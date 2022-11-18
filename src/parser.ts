import { Parser } from "prettier";
import {
	Delimiter,
	Keyword,
	Node,
	Placeholder,
	Statement,
	Block,
	nonClosingStatements,
	Expression,
	IgnoreBlock,
} from "./jinja";

const regex =
	/(?<pre>(?<newline>\n)?(\s*?))(?<node>{{\s*(?<expression>'([^']|\\')*'|"([^"]|\\")*"|[\S\s]*?)\s*}}|{%(?<startDelimiter>[-\+]?)\s*(?<statement>(?<keyword>for|endfor|if|else|endif|macro|endmacro|call|endcall|filter|endfilter|set|endset|include|import|from|extends|block|endblock)('([^']|\\')*'|"([^"]|\\")*"|[\S\s])*?)\s*(?<endDelimiter>[-\+]?)%}|(?<comment>{#[\S\s]*?#})|(?<scriptBlock><(script)((?!<)[\s\S])*>((?!<\/script)[\s\S])*?{{[\s\S]*?<\/(script)>)|(?<styleBlock><(style)((?!<)[\s\S])*>((?!<\/style)[\s\S])*?{{[\s\S]*?<\/(style)>)|(?<ignoreBlock><!-- prettier-ignore-start -->[\s\S]*<!-- prettier-ignore-end -->))/;

export const parse: Parser<Node>["parse"] = (text) => {
	const statementStack: Statement[] = [];

	const root: Node = {
		id: "0",
		type: "root" as const,
		content: text,
		ownLine: false,
		originalText: text,
		index: 0,
		length: 0,
		nodes: {},
	};

	const generatePlaceholder = placeholderGenerator(text);

	let match;
	let i = 0;
	while ((match = root.content.slice(i).match(regex)) !== null) {
		if (!match.groups || match.index === undefined) {
			continue;
		}
		if (match.groups.scriptBlock || match.groups.styleBlock) {
			i += match.index + match[0].length;
			continue;
		}

		const pre = match.groups.pre || "";
		const newline = !!match.groups.newline;

		const node = match.groups.node;
		const expression = match.groups.expression;
		const statement = match.groups.statement;
		const ignoreBlock = match.groups.ignoreBlock;
		const comment = match.groups.comment;

		if (!node && !expression && !statement && !ignoreBlock && !comment) {
			continue;
		}
		const matchText = node;

		if (ignoreBlock || comment) {
			const placeholder = generatePlaceholder();
			root.content = root.content.replace(matchText, placeholder);

			root.nodes[placeholder] = {
				id: placeholder,
				type: "ignore",
				content: ignoreBlock || comment,
				ownLine: newline,
				originalText: matchText,
				index: match.index + i + pre.length,
				length: matchText.length,
				nodes: root.nodes,
			} as IgnoreBlock;
			i += match.index;
		}

		if (expression) {
			const placeholder = generatePlaceholder();
			root.content = root.content.replace(matchText, placeholder);

			root.nodes[placeholder] = {
				id: placeholder,
				type: "expression",
				content: expression,
				ownLine: newline,
				originalText: matchText,
				index: match.index + i + pre.length,
				length: matchText.length,
				nodes: root.nodes,
			} as Expression;

			i += match.index;
		}

		if (statement) {
			const keyword = match.groups.keyword as Keyword;
			const startDelimiter = match.groups.startDelimiter as Delimiter;
			const endDelimiter = match.groups.endDelimiter as Delimiter;

			if (nonClosingStatements.includes(keyword)) {
				const placeholder = generatePlaceholder();
				root.content = root.content.replace(matchText, placeholder);
				root.nodes[placeholder] = {
					id: placeholder,
					type: "statement",
					content: statement,
					ownLine: newline,
					originalText: matchText,
					index: match.index + i + pre.length,
					length: matchText.length,
					keyword,
					startDelimiter,
					endDelimiter,
					nodes: root.nodes,
				} as Statement;

				i += match.index;
			} else if (!keyword.startsWith("end")) {
				statementStack.push({
					id: generatePlaceholder(),
					type: "statement" as const,
					content: statement,
					ownLine: newline,
					originalText: matchText,
					index: match.index + i + pre.length,
					length: matchText.length,
					keyword,
					startDelimiter,
					endDelimiter,
					nodes: root.nodes,
				});

				i += match.index + matchText.length;
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
							start = undefined;
							continue;
						}

						throw new Error(
							`Closung statement "${statement}" doesn't match Opening Statement "${start.content}".`
						);
					}
				}

				const end = {
					id: generatePlaceholder(),
					type: "statement" as const,
					content: statement,
					ownLine: newline,
					originalText: matchText,
					index: match.index + i + pre.length,
					length: matchText.length,
					keyword,
					startDelimiter,
					endDelimiter,
					nodes: root.nodes,
				};

				const placeholder = generatePlaceholder();
				const content = root.content.slice(
					start.index + start.length,
					end.index
				);

				root.nodes[placeholder] = {
					id: placeholder,
					type: "block",
					start: start,
					end: end,
					content,
					ownLine: newline,
					originalText: matchText,
					index: start.index,
					length: end.index + end.length - start.index,
					nodes: root.nodes,
				} as Block;

				root.nodes[start.id] = start;
				root.nodes[end.id] = end;

				root.content =
					root.content.slice(0, start.index) +
					placeholder +
					root.content.slice(end.index + end.length, root.content.length);

				i = start.index + placeholder.length;
			}
		}
	}

	const remainingStatement = statementStack.find(
		(stmt) => stmt.keyword !== "set"
	);
	if (remainingStatement) {
		throw new Error(
			`No closing statement found for opening statement "${remainingStatement.content}".`
		);
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
