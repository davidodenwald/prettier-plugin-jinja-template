import { findPlaceholders } from "../src/printer";

test("findPlaceholders should find placeholder", () => {
	expect(findPlaceholders("#~1~#")).toEqual([[0, 4]]);
	expect(findPlaceholders("XX#~1~#XX")).toEqual([[2, 6]]);
});

test("findPlaceholders should find multiple placeholders", () => {
	expect(findPlaceholders("#~1~##~99~#")).toEqual([
		[0, 4],
		[5, 10],
	]);
	expect(findPlaceholders("#~1~#X#~99~#")).toEqual([
		[0, 4],
		[6, 11],
	]);
	expect(findPlaceholders("#~1~##~X#~99~#")).toEqual([
		[0, 4],
		[5, 13],
		[8, 13],
	]);
	expect(findPlaceholders("#~1~##~99~#~#")).toEqual([
		[0, 4],
		[5, 10],
	]);
});

test("findPlaceholders should find no placeholders", () => {
	expect(findPlaceholders("")).toEqual([]);
	expect(findPlaceholders("#~#")).toEqual([]);
	expect(findPlaceholders("#~ #")).toEqual([]);
	expect(findPlaceholders("# ~#")).toEqual([]);
	expect(findPlaceholders("#~#~")).toEqual([]);
});
