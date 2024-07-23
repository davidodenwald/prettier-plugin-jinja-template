// Example inputs and expected outputs
import { transformJsonToGroups } from "./transform-json-to-groups";

const input1 =
	'{"textContentKind":"plain","multiline":false,"value":"`~6~` `~7~`","color":"textColorPositive","typography":"ActionPrimaryLarge"},{"textContentKind":"plain","multiline":false,"value":" из `~8~` `~9~`","color":"textColorPrimary","typography":"ActionPrimaryLarge"}';
const output1 = [
	'{"textContentKind":"plain","multiline":false,"value":"`~6~` `~7~`","color":"textColorPositive","typography":"ActionPrimaryLarge"}',
	",",
	'{"textContentKind":"plain","multiline":false,"value":" из `~8~` `~9~`","color":"textColorPrimary","typography":"ActionPrimaryLarge"}',
];

const input2 = '{"color":"`~13~`"}`~16~`';
const output2 = ['{"color":"`~13~`"}', "`~16~`"];

const input3 = 'prefix{"key":"value"}suffix';
const output3 = ["prefix", '{"key":"value"}', "suffix"];

describe("transform-json-to-groups", () => {
	const testCases = [
		{ input: input1, expected: output1 },
		{ input: input2, expected: output2 },
		{ input: input3, expected: output3 },
	];

	it.each(testCases)(`case with $input`, ({ input, expected }) => {
		expect(transformJsonToGroups(input)).toEqual(expected);
	});
});
