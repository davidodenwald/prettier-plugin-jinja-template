import { Node } from "./jinja";
import { parse } from "./parser";
import { print, embed, getVisitorKeys } from "./printer";
import {
	Parser,
	Printer,
	SupportLanguage,
	SupportOptions,
	ParserOptions,
} from "prettier";

const PLUGIN_KEY = "jinja-template";

export const languages: SupportLanguage[] = [
	{
		name: "JinjaTemplate",
		parsers: [PLUGIN_KEY],
		extensions: [".jinja", ".jinja2", ".j2", ".html"],
		vscodeLanguageIds: ["jinja", "jinja-html"],
	},
];

export const parsers = {
	[PLUGIN_KEY]: <Parser<Node>>{
		astFormat: PLUGIN_KEY,
		parse,
		locStart: (node) => node.index,
		locEnd: (node) => node.index + node.length,
	},
};

export const printers = {
	[PLUGIN_KEY]: <Printer<Node>>{
		print,
		embed,
		getVisitorKeys,
	},
};

export type extendedOptions = ParserOptions<Node> & {
	quoteAttributes: boolean;
};

export const options: SupportOptions = {
	quoteAttributes: {
		type: "boolean",
		category: PLUGIN_KEY,
		default: true,
		description: "Surrounds the value of html attributes with quotes.",
	},
};
