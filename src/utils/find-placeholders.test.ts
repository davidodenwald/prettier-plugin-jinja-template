import { findPlaceholders } from "./find-placeholders";

describe("findPlaceholders", () => {
	const jinjaCases = [
		{ input: "`~1~`", output: [[0, 5]] },
		{ input: "XX`~1~`XX", output: [[2, 7]] },
		{
			input: "`~1~``~99~`",
			output: [
				[0, 5],
				[5, 11],
			],
		},
		{
			input: "`~1~`X`~99~`",
			output: [
				[0, 5],
				[6, 12],
			],
		},
		{
			input: "`~1~``~X`~99~`",
			output: [
				[0, 5],
				[8, 14],
			],
		},
		{
			input: "`~1~``~99~`~`",
			output: [
				[0, 5],
				[5, 11],
			],
		},
		{ input: "", output: [] },
		{ input: "`~`", output: [] },
		{ input: "`~ `", output: [] },
		{ input: "` ~`", output: [] },
		{ input: "`~`~", output: [] },
	];

	it.each(jinjaCases)("jinja case with %s", ({ input, output }) => {
		expect(findPlaceholders(input, "jinja")).toEqual(output);
	});

	const jsonCases = [
		{ input: "__~1~__", output: [[0, 7]] },
		{ input: "XX__~1~__XX", output: [[2, 9]] },
		{
			input: "XX__~1~__XX__~2~__",
			output: [
				[2, 9],
				[11, 18],
			],
		},
		{
			input: "XX__~1~____~2~__",
			output: [
				[2, 9],
				[9, 16],
			],
		},
		{
			input: '{"type": "StackView","content": __~4~__,"size": __~5~__}',
			output: [
				[32, 32 + 7],
				[48, 48 + 7],
			],
		},
	];

	it.each(jsonCases)("jsonCases case with %s", ({ input, output }) => {
		expect(findPlaceholders(input, "json")).toEqual(output);
	});
});
