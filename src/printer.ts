import { AstPath, Doc, Options, Printer } from "prettier";
import { builders, utils } from "prettier/doc";
import {
	BlockNode,
	ExpressionNode,
	Node,
	Placeholder,
	StatementNode,
} from "./jinja";

const NOT_FOUND = -1;

process.env.PRETTIER_DEBUG = "true";

export const getVisitorKeys = (
	ast: Node | { [id: string]: Node },
): string[] => {
	if ("type" in ast) {
		return ast.type === "root" ? ["nodes"] : [];
	}
	return Object.values(ast)
		.filter((node) => {
			return node.type === "block";
		})
		.map((e) => e.id);
};

export const print: Printer<Node>["print"] = (path) => {
	const node = path.getNode();
	if (!node) {
		return [];
	}

	switch (node.type) {
		case "expression":
			return printExpression(node);
		case "statement":
			return printStatement(node);
		case "comment":
			return printCommentBlock(node);
		case "ignore":
			return printIgnoreBlock(node);
	}
	return [];
};

const printExpression = (node: ExpressionNode): builders.Doc => {
	const multiline = node.content.includes("\n");

	const expression = builders.group(
		builders.join(" ", [
			["{{", node.delimiter.start],
			multiline
				? builders.indent(getMultilineGroup(node.content))
				: node.content,
			multiline
				? [builders.hardline, node.delimiter.end, "}}"]
				: [node.delimiter.end, "}}"],
		]),
		{
			shouldBreak: node.preNewLines > 0,
		},
	);

	return node.preNewLines > 1
		? builders.group([builders.trim, builders.hardline, expression])
		: expression;
};

const printStatement = (node: StatementNode): builders.Doc => {
	const multiline = node.content.includes("\n");

	const statemnt = builders.group(
		builders.join(" ", [
			["{%", node.delimiter.start],
			multiline
				? builders.indent(getMultilineGroup(node.content))
				: node.content,
			multiline
				? [builders.hardline, node.delimiter.end, "%}"]
				: [node.delimiter.end, "%}"],
		]),
		{ shouldBreak: node.preNewLines > 0 },
	);

	if (
		["else", "elif"].includes(node.keyword) &&
		surroundingBlock(node)?.containsNewLines
	) {
		return [builders.dedent(builders.hardline), statemnt, builders.hardline];
	}

	if (node.keyword === "set" && node.preNewLines > 1) {
		return builders.group([builders.trim, builders.hardline, statemnt]);
	}

	return statemnt;
};

const printCommentBlock = (node: Node): builders.Doc => {
	const comment = builders.group(node.content, {
		shouldBreak: node.preNewLines > 0,
	});

	return node.preNewLines > 1
		? builders.group([builders.trim, builders.hardline, comment])
		: comment;
};

const printIgnoreBlock = (node: Node): builders.Doc => {
	return node.content;
};

export const embed: Printer<Node>["embed"] = () => {
	return async (
		textToDoc: (text: string, options: Options) => Promise<Doc>,
		print: (
			selector?: string | number | Array<string | number> | AstPath,
		) => Doc,
		path: AstPath,
		options: Options,
	): Promise<Doc | undefined> => {
		const node = path.getNode();
		if (!node || !["root", "block"].includes(node.type)) {
			return undefined;
		}

		const mapped = await Promise.all(
			splitAtElse(node).map(async (content) => {
				let doc;
				if (content in node.nodes) {
					doc = content;
				} else {
					doc = await textToDoc(content, {
						...options,
						parser: "html",
					});
				}

				let ignoreDoc = false;

				return utils.mapDoc(doc, (currentDoc) => {
					if (typeof currentDoc !== "string") {
						return currentDoc;
					}

					if (currentDoc === "<!-- prettier-ignore -->") {
						ignoreDoc = true;
						return currentDoc;
					}

					const idxs = findPlaceholders(currentDoc).filter(
						([start, end]) => currentDoc.slice(start, end + 1) in node.nodes,
					);
					if (!idxs.length) {
						ignoreDoc = false;
						return currentDoc;
					}

					const res: builders.Doc = [];
					let lastEnd = 0;
					for (const [start, end] of idxs) {
						if (lastEnd < start) {
							res.push(currentDoc.slice(lastEnd, start));
						}

						const p = currentDoc.slice(start, end + 1);

						if (ignoreDoc) {
							res.push(node.nodes[p].originalText);
						} else {
							res.push(path.call(print, "nodes", p));
						}

						lastEnd = end + 1;
					}

					if (lastEnd > 0 && currentDoc.length > lastEnd) {
						res.push(currentDoc.slice(lastEnd));
					}

					ignoreDoc = false;
					return res;
				});
			}),
		);

		if (node.type === "block") {
			const block = buildBlock(path, print, node, mapped);

			return node.preNewLines > 1
				? builders.group([builders.trim, builders.hardline, block])
				: block;
		}
		return [...mapped, builders.hardline];
	};
};

const getMultilineGroup = (content: String): builders.Group => {
	// Dedent the content by the minimum indentation of any non-blank lines.
	const lines = content.split("\n");
	const minIndent = Math.min(
		...lines
			.slice(1) // can't be the first line
			.filter((line) => line.trim())
			.map((line) => line.search(/\S/)),
	);

	return builders.group(
		lines.map((line, i) => [
			builders.hardline,
			i === 0
				? line.trim() // don't dedent the first line
				: line.trim()
					? line.slice(minIndent).trimEnd()
					: "",
		]),
	);
};

const splitAtElse = (node: Node): string[] => {
	const elseNodes = Object.values(node.nodes).filter(
		(n): n is StatementNode =>
			n.type === "statement" &&
			["else", "elif"].includes(n.keyword) &&
			node.content.search(n.id) !== NOT_FOUND,
	);
	if (!elseNodes.length) {
		return [node.content];
	}

	const re = new RegExp(`(${elseNodes.map((e) => e.id).join(")|(")})`);
	return node.content.split(re).filter(Boolean);
};

/**
 * Returns the indexs of the first and the last character of any placeholder
 * occuring in a string.
 */
export const findPlaceholders = (text: string): [number, number][] => {
	const res: [number, number][] = [];
	let i = 0;

	while (true) {
		const start = text.slice(i).search(Placeholder.startToken);
		if (start === NOT_FOUND) break;
		const end = text
			.slice(start + i + Placeholder.startToken.length)
			.search(Placeholder.endToken);
		if (end === NOT_FOUND) break;

		res.push([start + i, end + start + i + Placeholder.startToken.length + 1]);
		i += start + Placeholder.startToken.length;
	}
	return res;
};

export const surroundingBlock = (node: Node): BlockNode | undefined => {
	return Object.values(node.nodes).find(
		(n): n is BlockNode =>
			n.type === "block" && n.content.search(node.id) !== NOT_FOUND,
	);
};

const buildBlock = (
	path: AstPath<Node>,
	print: (path: AstPath<Node>) => builders.Doc,
	block: BlockNode,
	mapped: (string | builders.Doc[] | builders.DocCommand)[],
): builders.Doc => {
	// if the content is empty or whitespace only.
	if (block.content.match(/^\s*$/)) {
		return builders.fill([
			path.call(print, "nodes", block.start.id),
			builders.softline,
			path.call(print, "nodes", block.end.id),
		]);
	}
	if (block.containsNewLines) {
		return builders.group([
			path.call(print, "nodes", block.start.id),
			builders.indent([builders.softline, mapped]),
			builders.hardline,
			path.call(print, "nodes", block.end.id),
		]);
	}
	return builders.group([
		path.call(print, "nodes", block.start.id),
		mapped,
		path.call(print, "nodes", block.end.id),
	]);
};
