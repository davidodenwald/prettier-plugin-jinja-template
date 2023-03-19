import { Printer } from "prettier";
import { builders, utils } from "prettier/doc";
import {
	Placeholder,
	Node,
	Expression,
	Statement,
	Block,
	IgnoreBlock,
} from "./jinja";

const NOT_FOUND = -1;

process.env.PRETTIER_DEBUG = "true";

export const print: Printer<Node>["print"] = (path) => {
	const node = path.getNode();
	if (!node) {
		return [];
	}

	switch (node.type) {
		case "expression":
			return printExpression(node as Expression);
		case "statement":
			return printStatement(node as Statement);
		case "ignore":
			return printIgnoreBlock(node as IgnoreBlock);
	}
	return [];
};

const printExpression = (node: Expression): builders.Doc => {
	const multiline = node.content.includes("\n");

	return builders.group(
		builders.join(" ", [
			"{{",
			multiline
				? builders.indent([getMultilineGroup(node.content)])
				: node.content,
			multiline ? [builders.hardline, "}}"] : "}}",
		]),
		{
			shouldBreak: node.ownLine,
		}
	);
};

const printStatement = (node: Statement): builders.Doc => {
	const multiline = node.content.includes("\n");

	const statemnt = builders.group(
		builders.join(" ", [
			["{%", node.delimiter],
			multiline
				? builders.indent(getMultilineGroup(node.content))
				: node.content,
			multiline
				? [builders.hardline, node.delimiter, "%}"]
				: [node.delimiter, "%}"],
		]),
		{ shouldBreak: node.ownLine }
	);

	if (
		["else", "elif"].includes(node.keyword) &&
		surroundingBlock(node)?.ownLine
	) {
		return [builders.dedent(builders.hardline), statemnt, builders.hardline];
	}
	return statemnt;
};

const printIgnoreBlock = (node: IgnoreBlock): builders.Doc => {
	return builders.group(node.content, { shouldBreak: node.ownLine });
};

export const embed: Printer<Node>["embed"] = (
	path,
	print,
	textToDoc,
	options
) => {
	const node = path.getNode();
	if (!node || !["root", "block"].includes(node.type)) {
		return null;
	}

	const mapped = splitAtElse(node).map((content) => {
		let doc;
		if (content in node.nodes) {
			doc = content;
		} else {
			doc = utils.stripTrailingHardline(
				textToDoc(content, {
					...options,
					parser: "html",
				})
			);
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
				([start, end]) => currentDoc.slice(start, end + 1) in node.nodes
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

				const p = currentDoc.slice(start, end + 1) as string;

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
	});

	if (node.type === "block") {
		if (node.content.includes("\n")) {
			return builders.group([
				path.call(print, "nodes", (node as Block).start.id),
				builders.indent([
					builders.softline,
					utils.stripTrailingHardline(mapped),
				]),
				builders.hardline,
				path.call(print, "nodes", (node as Block).end.id),
			]);
		}
		return builders.group([
			path.call(print, "nodes", (node as Block).start.id),
			utils.stripTrailingHardline(mapped),
			path.call(print, "nodes", (node as Block).end.id),
		]);
	}
	return [...mapped, builders.hardline];
};

const getMultilineGroup = (content: String): builders.Group => {
	return builders.group(
		content.split("\n").map((line, i) => {
			return [builders.hardline, line.trim()];
		})
	);
};

const splitAtElse = (node: Node): string[] => {
	const elseNodes = Object.values(node.nodes).filter(
		(n) =>
			n.type === "statement" &&
			["else", "elif"].includes((n as Statement).keyword) &&
			node.content.search(n.id) !== NOT_FOUND
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
	const res = [];
	let i = 0;

	while (true) {
		const start = text.slice(i).search(Placeholder.startToken);
		if (start === NOT_FOUND) break;
		const end = text
			.slice(start + i + Placeholder.startToken.length)
			.search(Placeholder.endToken);
		if (end === NOT_FOUND) break;

		res.push([
			start + i,
			end + start + i + Placeholder.startToken.length + 1,
		] as [number, number]);
		i += start + Placeholder.startToken.length;
	}
	return res;
};

export const surroundingBlock = (node: Node): Block | undefined => {
	return Object.values(node.nodes).find(
		(n) => n.type === "block" && n.content.search(node.id) !== NOT_FOUND
	) as Block;
};
