import { AstPath, Doc, Options, Printer } from "prettier";
import { builders, printer as docPrinter, utils } from "prettier/doc";
import {
	BlockNode,
	ExpressionNode,
	Node,
	Placeholder,
	StatementNode,
} from "./jinja";

const NOT_FOUND = -1;

const PLACEHOLDER_RE = new RegExp(
	Placeholder.startToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
		"\\d+" +
		Placeholder.endToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
);

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
	return node.originalText;
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

interface StrippedComment {
	placeholder: string;
	lineContent: string;
}

/**
 * Strip inline comment placeholders (preNewLines === 0) that follow
 * an HTML tag from content before HTML formatting. Records the
 * trimmed line content preceding each comment for position matching.
 */
const stripInlineComments = (
	content: string,
	nodes: { [id: string]: Node },
): { strippedContent: string; stripped: StrippedComment[] } => {
	const stripped: StrippedComment[] = [];
	let strippedContent = content;
	const re = new RegExp(PLACEHOLDER_RE.source, "g");
	let match;

	while ((match = re.exec(strippedContent)) !== null) {
		const p = match[0];
		const n = nodes[p];
		if (n && n.type === "comment" && n.preNewLines === 0) {
			const before = strippedContent.slice(0, match.index);
			if (!before.match(/<\/[^>]+>$|<[^>]+\/>$/)) {
				continue;
			}
			const lastNewline = before.lastIndexOf("\n");
			const lineContent = before.slice(lastNewline + 1).trim();
			stripped.push({ placeholder: p, lineContent });
			strippedContent =
				strippedContent.slice(0, match.index) +
				strippedContent.slice(match.index + p.length);
			re.lastIndex = match.index;
		}
	}

	return { strippedContent, stripped };
};

/**
 * Extract leading inline comment placeholders from block content
 * so they stay on the same line as the block's start statement.
 */
const extractLeadingComments = (
	block: BlockNode,
): { commentIds: string[]; remaining: string } => {
	const commentIds: string[] = [];
	const re = new RegExp("^\\s*(" + PLACEHOLDER_RE.source + ")");
	let remaining = block.content;
	let match;
	while ((match = remaining.match(re)) !== null) {
		const p = match[1];
		const n = block.nodes[p];
		if (n && n.type === "comment" && n.preNewLines === 0) {
			commentIds.push(p);
			remaining = remaining.slice(match[0].length);
		} else {
			break;
		}
	}
	return { commentIds, remaining };
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

		// For block nodes, extract leading inline comments so they
		// stay on the same line as the start statement.
		let leadingCommentDocs: builders.Doc[] = [];
		let blockContentOverride: string | undefined;
		if (node.type === "block") {
			const { commentIds, remaining } = extractLeadingComments(
				node as BlockNode,
			);
			if (commentIds.length) {
				leadingCommentDocs = commentIds.map((id) =>
					path.call(print, "nodes", id),
				);
				blockContentOverride = remaining;
			}
		}

		const nodeToSplit =
			blockContentOverride !== undefined
				? { ...node, content: blockContentOverride }
				: node;

		const mapped = await Promise.all(
			splitAtElse(nodeToSplit).map(async (content) => {
				if (content in node.nodes) {
					return replacePlaceholders(
						content as Doc,
						node,
						path,
						print,
					);
				}

				const { strippedContent, stripped } = stripInlineComments(
					content,
					node.nodes,
				);

				const doc = await textToDoc(strippedContent, {
					...options,
					parser: "html",
				});

				let result = replacePlaceholders(doc, node, path, print);

				// Reinsert stripped inline comments by printing the doc
				// to a string and splicing comments at line ends.
				if (stripped.length) {
					const formatted = docToString(result, options);
					let output = formatted;

					for (const { placeholder, lineContent } of stripped) {
						const commentText = node.nodes[placeholder].content;
						if (!lineContent) {
							continue;
						}
						const escaped = lineContent.replace(
							/[.*+?^${}()|[\]\\]/g,
							"\\$&",
						);
						// Match the line containing this content and
						// insert the comment at the end of that line.
						const lineRe = new RegExp(
							escaped + ".*?(?=\\n|$)",
						);
						const lineMatch = output.match(lineRe);
						if (lineMatch && lineMatch.index !== undefined) {
							const insertAt =
								lineMatch.index +
								lineMatch[0].trimEnd().length;
							output =
								output.slice(0, insertAt) +
								commentText +
								output.slice(insertAt);
						}
					}

					result = output;
				}

				return result;
			}),
		);

		if (node.type === "block") {
			const block = buildBlock(
				path,
				print,
				node,
				mapped,
				leadingCommentDocs,
			);

			return node.preNewLines > 1
				? builders.group([builders.trim, builders.hardline, block])
				: block;
		}
		return [...mapped, builders.hardline];
	};
};

/**
 * Replace placeholder tokens in a doc with their formatted Jinja nodes.
 */
const replacePlaceholders = (
	doc: Doc,
	node: Node,
	path: AstPath,
	print: (
		selector?: string | number | Array<string | number> | AstPath,
	) => Doc,
): Doc => {
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
};

/**
 * Print a prettier Doc to a string for post-processing.
 */
const docToString = (doc: Doc, options: Options): string => {
	const { formatted } = (
		docPrinter as unknown as {
			printDocToString: (
				doc: Doc,
				opts: { printWidth: number; tabWidth: number },
			) => { formatted: string };
		}
	).printDocToString(doc, {
		printWidth: options.printWidth ?? 80,
		tabWidth: options.tabWidth ?? 2,
	});
	return formatted;
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
	leadingCommentDocs: builders.Doc[],
): builders.Doc => {
	// if the content is empty or whitespace only.
	if (block.content.match(/^\s*$/)) {
		return builders.fill([
			path.call(print, "nodes", block.start.id),
			...leadingCommentDocs,
			builders.softline,
			path.call(print, "nodes", block.end.id),
		]);
	}
	if (block.containsNewLines) {
		return builders.group([
			path.call(print, "nodes", block.start.id),
			...leadingCommentDocs,
			builders.indent([builders.softline, mapped]),
			builders.hardline,
			path.call(print, "nodes", block.end.id),
		]);
	}
	return builders.group([
		path.call(print, "nodes", block.start.id),
		...leadingCommentDocs,
		mapped,
		path.call(print, "nodes", block.end.id),
	]);
};
