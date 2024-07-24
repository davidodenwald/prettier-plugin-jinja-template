import { Placeholder } from "../constants";
import { PlaceholderStyle } from "../types";

export const placeholderGenerator = (text: string, style: PlaceholderStyle) => {
	let id = 0;

	return (): string => {
		id++;

		const placeholder =
			Placeholder[style].startToken + id + Placeholder[style].endToken;
		if (text.includes(placeholder)) {
			throw new Error("text have this Placeholder");
		}
		return placeholder;
	};
};

export const replaceAt = (
	str: string,
	replacement: string,
	start: number,
	length: number,
): string => {
	return str.slice(0, start) + replacement + str.slice(start + length);
};
