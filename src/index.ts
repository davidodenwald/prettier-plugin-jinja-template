import { Node } from "./types";
import { parse } from "./parser";
import { embed, getVisitorKeys, print } from "./printer";
import {
	format,
	Parser,
	ParserOptions,
	Printer,
	SupportLanguage,
	SupportOptions,
} from "prettier";
import { readFileSync } from "fs";

export const PLUGIN_KEY = "jinja-json-template";

export const languages: SupportLanguage[] = [
	{
		name: "JinjaTemplate",
		parsers: [PLUGIN_KEY],
		extensions: [".jinja", ".jinja2", ".j2", ".html"],
		vscodeLanguageIds: ["jinja"],
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

export type extendedOptions = ParserOptions<Node>;

export const options: SupportOptions = {};

(async () => {
	const plugin = {
		languages,
		parsers,
		printers,
		options,
	};
	const data = readFileSync("./data.jjson").toString();
	console.log(
		await format(data, {
			parser: PLUGIN_KEY,
			plugins: [plugin],
		}),
	);
})();
