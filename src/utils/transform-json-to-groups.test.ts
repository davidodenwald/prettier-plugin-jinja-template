// Example inputs and expected outputs
import { transformJsonToGroups } from "./transform-json-to-groups";

const input1 =
	'{"textContentKind":"plain","multiline":false,"value":"`~6~` `~7~`","color":"textColorPositive","typography":"ActionPrimaryLarge"},{"textContentKind":"plain","multiline":false,"value":" из `~8~` `~9~`","color":"textColorPrimary","typography":"ActionPrimaryLarge"}';
const output1 = [
	'{"textContentKind":"plain","multiline":false,"value":"`~6~` `~7~`","color":"textColorPositive","typography":"ActionPrimaryLarge"}',
	",",
	'{"textContentKind":"plain","multiline":false,"value":" из `~8~` `~9~`","color":"textColorPrimary","typography":"ActionPrimaryLarge"}',
];

describe("transform-json-to-groups", () => {
	const testCases = [
		{ input: input1, expected: output1 },
		{
			input: '{"color":"`~13~`"}`~16~`',
			expected: ['{"color":"`~13~`"}', "`~16~`"],
		},
		{
			input: 'prefix{"key":"value"}suffix',
			expected: ["prefix", '{"key":"value"}', "suffix"],
		},
		{ input: 'prefix{"key":"value"', expected: ['prefix{"key":"value"'] },
		{ input: '"key":"value"}', expected: ['"key":"value"}'] },
		{
			input: '{"key":{"newKey": false}',
			expected: ['{"key":', '{"newKey": false}'],
		},
		{
			input: '{"type": "Spacer","content": {}}',
			expected: ['{"type": "Spacer","content": {}}'],
		},
	];

	it.each(testCases)(`case with $input`, ({ input, expected }) => {
		const groups = transformJsonToGroups(input);
		expect(groups).toEqual(expected);
		expect(groups.join("")).toHaveLength(input.length);
	});
});
