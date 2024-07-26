import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { format } from "prettier/standalone";

import { plugin, PLUGIN_KEY } from "../src";

describe("plugins", () => {
	const testFolder = join(__dirname, "cases");
	const tests = readdirSync(testFolder).filter((test) => !test.startsWith("_"));

	it.each(tests)("should json jinja: %s be valid", async (test) => {
		const path = join(testFolder, test);
		const input = readFileSync(join(path, "input.json")).toString();
		const expected = readFileSync(join(path, "expected.json")).toString();

		const formated = () => format(input, {
			parser: PLUGIN_KEY,
			plugins: [plugin]
		});

		const expectedError = expected.match(/Error\(["'`](?<message>.*)["'`]\)/)
			?.groups?.message;

		if (expectedError) {
			await expect(formated).rejects.toThrow(expectedError);
			return;
		}

		expect(await formated()).toEqual(expected);
	});
});
