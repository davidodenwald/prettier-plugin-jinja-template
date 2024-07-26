import { AstPath, Doc, Printer } from "prettier";
import { builders, utils } from "prettier/doc";
import { Block, Expression, Node, Statement } from "./types";
import { NOT_FOUND } from "./constants";
import { transformJsonToGroups } from "./utils/transform-json-to-groups";
import { findPlaceholders } from "./utils/find-placeholders";

const STYLE = "jinja" as const;

export const getVisitorKeys = (
  ast: Node | { [id: string]: Node },
): string[] => {
  if ("type" in ast) {
    return ast.type === "root" ? ["nodes"] : [];
  }
  return Object.values<Node>(ast)
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
      return printExpression(node as Expression);
    case "statement":
      return printStatement(node as Statement);
    case "comment":
      return printCommentBlock(node);
    case "ignore":
      return printIgnoreBlock(node);
  }
  return [];
};

const printExpression = (node: Expression): builders.Doc => {
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

const printStatement = (node: Statement): builders.Doc => {
  const multiline = node.content.includes("\n");

  const statement = builders.group(
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
    return [builders.dedent(builders.hardline), statement, builders.hardline];
  }
  return statement;
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

export const embed: Printer<Node>["embed"] =
  () =>
  async (textToDoc, print, path, options): Promise<Doc | undefined> => {
    const node = path.getNode();

    if (!node || !["root", "block"].includes(node.type)) {
      return undefined;
    }

    const mapped = await Promise.all(
      splitAtElse(node).map(async (content) => {
        const contentGroups = transformJsonToGroups(content);
        const document: Doc = [];

        for (const group of contentGroups) {
          try {
            document.push(
              await textToDoc(group, {
                ...options,
                parser: "json",
              }),
            );
          } catch (e) {
            document.push(group);
          }
        }

        let ignoreDoc = false;

        return utils.mapDoc(document, (currentDoc) => {
          if (typeof currentDoc !== "string") {
            return currentDoc;
          }

          const idxs = findPlaceholders(currentDoc, STYLE).filter(
            ([start, end]) => currentDoc.slice(start, end) in node.nodes,
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

            const p = currentDoc.slice(start, end) as string;

            if (ignoreDoc) {
              res.push(node.nodes[p].originalText);
            } else {
              res.push(path.call(print, "nodes", p));
            }

            lastEnd = end;
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
      const block = buildBlock(path, print, node as Block, mapped);

      return node.preNewLines > 1
        ? builders.group([builders.trim, builders.hardline, block])
        : block;
    }
    return [...mapped, builders.hardline];
  };

const getMultilineGroup = (content: string): builders.Group => {
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

const splitAtElse = (node: Statement): string[] => {
  const content = node.content;

  const elseNodes = Object.values<Node>(node.nodes).filter(
    (statement) =>
      statement.type === "statement" &&
      ["else", "elif"].includes((statement as Statement).keyword) &&
      content.search(statement.id) !== NOT_FOUND,
  );

  if (!elseNodes.length) {
    return [content];
  }

  const re = new RegExp(`(${elseNodes.map((e) => e.id).join(")|(")})`);

  return content.split(re).filter(Boolean);
};

const surroundingBlock = (node: Node): Block | undefined => {
  return Object.values<Node>(node.nodes).find(
    (n) => n.type === "block" && n.content.search(node.id) !== NOT_FOUND,
  ) as Block;
};

const buildBlock = (
  path: AstPath<Node>,
  print: (path: AstPath<Node>) => builders.Doc,
  block: Block,
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
