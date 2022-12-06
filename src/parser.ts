import { Parser } from "prettier";
import {
	Delimiter,
	Keyword,
	Node,
	Placeholder,
	Statement,
	Block,
	nonClosingStatements,
} from "./jinja";

const regex =
	/(?<pre>(?<newline>\n)?(\s*?))(?<node>{{\s*(?<expression>'([^']|\\')*'|"([^"]|\\")*"|[\S\s]*?)\s*}}|{%(?<startDelimiter>[-+]?)\s*(?<statement>(?<keyword>for|endfor|if|else|elif|endif|macro|endmacro|call|endcall|filter|endfilter|set|endset|include|import|from|extends|block|endblock)('([^']|\\')*'|"([^"]|\\")*"|[\S\s])*?)\s*(?<endDelimiter>[-+]?)%}|(?<comment>{#[\S\s]*?#})|(?<scriptBlock><(script)((?!<)[\s\S])*>((?!<\/script)[\s\S])*?{{[\s\S]*?<\/(script)>)|(?<styleBlock><(style)((?!<)[\s\S])*>((?!<\/style)[\s\S])*?{{[\s\S]*?<\/(style)>)|(?<ignoreBlock><!-- prettier-ignore-start -->[\s\S]*<!-- prettier-ignore-end -->))/;

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

		const pre = match.groups.pre || "";
		const newline = !!match.groups.newline;

		const matchText = match.groups.node;
		const expression = match.groups.expression;
		const statement = match.groups.statement;
		const ignoreBlock = match.groups.ignoreBlock;
		const comment = match.groups.comment;

		if (!matchText && !expression && !statement && !ignoreBlock && !comment) {
			continue;
		}
		const placeholder = generatePlaceholder();

		const node = {
			id: placeholder,
			ownLine: newline,
			originalText: matchText,
			index: match.index + i + pre.length,
			length: matchText.length,
			nodes: root.nodes,
		};

		if (ignoreBlock || comment) {
			root.content = root.content.replace(matchText, placeholder);
			root.nodes[node.id] = {
				...node,
				type: "ignore",
				content: ignoreBlock || comment,
			};
		}

		if (expression) {
			root.content = root.content.replace(matchText, placeholder);
			root.nodes[node.id] = {
				...node,
				type: "expression",
				content: expression,
			};
		}

		if (statement) {
			const keyword = match.groups.keyword as Keyword;
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
							`Closung statement "${statement}" doesn't match Opening Statement "${start.content}".`
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

				const block = {
					id: generatePlaceholder(),
					type: "block",
					start: start,
					end: end,
					content: blockText.slice(start.length, blockText.length - end.length),
					ownLine: newline,
					originalText: text.slice(start.index, end.index + end.length),
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
