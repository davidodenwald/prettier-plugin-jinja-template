import { Node } from "./types";
import { parse } from "./parser";
import { embed, getVisitorKeys, print } from "./printer";
import type {
  Parser,
  ParserOptions,
  Printer,
  SupportLanguage,
  SupportOptions,
} from "prettier";
import { parsers as babelParsers } from "prettier/plugins/babel";

// only common js imports.. without typing :: why? i dont know
// eslint-disable-next-line @typescript-eslint/no-var-requires
const estree = require("prettier/plugins/estree");

export const PLUGIN_KEY = "jinja-json-template";

export const languages: SupportLanguage[] = [
  {
    name: "JinjaJsonTemplate",
    parsers: [PLUGIN_KEY, "json"],
    extensions: [".json.jinja", ".json.jinja2", ".json.j2"],
    vscodeLanguageIds: ["jinja"],
  },
];

export const parsers = {
  json: babelParsers.json,
  [PLUGIN_KEY]: <Parser<Node>>{
    astFormat: PLUGIN_KEY,
    parse,
    locStart: (node) => node.index,
    locEnd: (node) => node.index + node.length,
  },
};

export const printers = {
  estree: estree.printers.estree,
  [PLUGIN_KEY]: <Printer<Node>>{
    print,
    embed,
    getVisitorKeys,
  },
};

export type extendedOptions = ParserOptions<Node>;

export const options: SupportOptions = {};

export const plugin = {
  languages,
  parsers,
  printers,
  options,
} as const;
