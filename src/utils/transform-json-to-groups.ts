export const transformJsonToGroups = (input: string): string[] => {
	const result: string[] = [];
	const stack: string[] = [];
	let jsonStartIndex = -1;
	let lastEndIndex = 0;

	for (let i = 0; i < input.length; i++) {
		if (input[i] === "{" || input[i] === "[") {
			if (stack.length === 0) {
				jsonStartIndex = i;
			}
			stack.push(input[i]);
		} else if (input[i] === "}" || input[i] === "]") {
			const last = stack.pop();
			if (
				(last === "{" && input[i] !== "}") ||
				(last === "[" && input[i] !== "]")
			) {
				throw new Error("Mismatched brackets");
			}
			if (stack.length === 0 && jsonStartIndex !== -1) {
				if (jsonStartIndex > lastEndIndex) {
					result.push(input.substring(lastEndIndex, jsonStartIndex));
				}
				result.push(input.substring(jsonStartIndex, i + 1));
				lastEndIndex = i + 1;
				jsonStartIndex = -1;
			}
		}
	}

	// Handle any remaining text after the last JSON object/array
	if (lastEndIndex < input.length) {
		result.push(input.substring(lastEndIndex));
	}

	return result;
};
