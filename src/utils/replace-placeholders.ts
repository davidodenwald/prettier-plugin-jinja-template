import { findPlaceholders } from "./find-placeholders";
import { replaceAt } from "./placeholder-generator";

/**
 * Deeply replace placeholders in input
 * @param input
 * @param placeholders
 */
export const replacePlaceholders = (
    input: string,
    placeholders: Record<string, string>,
): string => {
    let result = input;
    let placeholderPositions = findPlaceholders(result, "json");

    // Loop until there are no more placeholders to replace
    while (placeholderPositions.length > 0) {
        for (const [start, end] of placeholderPositions) {
            const placeholder = result.slice(start, end);
            const replacement = placeholders[placeholder];
            if (replacement) {
                // Replace the placeholder in the result string
                result = replaceAt(
                    result,
                    replacement,
                    start,
                    placeholder.length,
                );
            }
        }
        // Find new placeholders in the updated result string
        placeholderPositions = findPlaceholders(result, "json");
    }

    return result;
};
