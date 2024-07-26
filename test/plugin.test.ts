import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { format } from "prettier/standalone";

import { plugin, PLUGIN_KEY } from "../src";

describe("plugins", () => {

	const formated = (input: string) => format(input, {
		parser: PLUGIN_KEY,
		plugins: [plugin]
	});

	describe("valid", () => {
		const validCaseFolder = join(__dirname, "cases");
		const tests = readdirSync(validCaseFolder).filter((f) => f.endsWith(".json.jinja"));

		it.each(tests)("should json jinja: %s be valid", async (test) => {
			const testPath = join(validCaseFolder, test);
			const input = readFileSync(testPath).toString();

			expect(await formated(input)).toMatchSnapshot(test);
		});
	});

	describe("broken", () => {

		const brokenNotOpenStatementFolder = join(__dirname, "cases", "broken_not_open_statement");
		const testsBroken = readdirSync(brokenNotOpenStatementFolder).filter((f) => f.endsWith(".json.jinja"));

		it.each(testsBroken)("should json jinja: %s be broken_not_open_statement", async (test) => {
			const testPath = join(brokenNotOpenStatementFolder, test);
			const input = readFileSync(testPath).toString();

			await expect(() => formated(input)).rejects.toThrow(/No opening statement found for closing statement "(.*)"/);
		});

	});
});
