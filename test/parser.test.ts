import { parse } from "../src/parser";
import { ParserOptions } from "prettier";

test("benchmark catastrophic backtracking in expression", async () => {
	expect(
		(
			await parse(
				"<div>{{ '''''''''''''''''''''''''''''''''' </div>",
				{} as ParserOptions,
			)
		).content,
	).toEqual("<div>{{ '''''''''''''''''''''''''''''''''' </div>");
});

test("benchmark catastrophic backtracking in statement", async () => {
	expect(
		(
			await parse(
				"<div>{% for '''''''''''''''''''''''''''''''''''' </div>",
				{} as ParserOptions,
			)
		).content,
	).toEqual("<div>{% for '''''''''''''''''''''''''''''''''''' </div>");
});
