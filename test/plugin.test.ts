import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { format, Options } from "prettier";
import * as jinjaPlugin from "../src/index";

const prettify = (code: string, options: Options) =>
	format(code, {
		parser: "jinja-template",
		plugins: [jinjaPlugin],
		...options,
	});

const testFolder = join(__dirname, "cases");
const tests = readdirSync(testFolder);

tests.forEach((test) => {
	if (test.startsWith("_")) {
		return;
	}
	return it(test, async () => {
		const path = join(testFolder, test);
		const input = readFileSync(join(path, "input.html")).toString();
		const expected = readFileSync(join(path, "expected.html")).toString();

		const configPath = join(path, "config.json");
		const configString =
			existsSync(configPath) && readFileSync(configPath)?.toString();
		const configObject = configString ? JSON.parse(configString) : {};

		const format = () => prettify(input, configObject);

		const expectedError = expected.match(/Error\(["'`](?<message>.*)["'`]\)/)
			?.groups?.message;

		if (expectedError) {
			jest.spyOn(console, "error").mockImplementation(() => {});
			await expect(format()).rejects.toThrow(expectedError);
		} else {
			const result = await format();
			expect(result).toEqual(expected);
			expect(await prettify(result, configObject)).toEqual(expected);
		}
	});
});
