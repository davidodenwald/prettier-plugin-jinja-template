import { replacePlaceholders } from "./replace-placeholders";

describe("replacePlaceholders", () => {
	it("should works fine", () => {
		const placeholders = {
			"__~1~__": '{"value": "`~1~`","maxLineCount": 2}',
			"__~2~__": '{"text": __~1~__}',
			"__~3~__": '{"type": "LabelView","content": __~2~__}',
			"__~4~__":
				'{"axis": "vertical","alignment": "start","distribution": "default","children": [__~3~__]}',
		};

		const input = '{"data": __~4~__}';
		const output =
			'{"data": {"axis": "vertical","alignment": "start","distribution": "default","children": [{"type": "LabelView","content": {"text": {"value": "`~1~`","maxLineCount": 2}}}]}}';

		expect(replacePlaceholders(input, placeholders)).toEqual(output);
	});
});
