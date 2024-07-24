import { Placeholder } from "../constants";
import { PlaceholderStyle } from "../types";

type StartEndIndx = [number, number];
/**
 * Returns the indexs of the first and the last character of any placeholder
 * occuring in a string.
 */
export const findPlaceholders = (
  text: string,
  style: PlaceholderStyle,
): StartEndIndx[] => {
  const placeholders: StartEndIndx[] = [];

  const { startToken, endToken } = Placeholder[style];

  const regex = new RegExp(`${startToken}\\d+${endToken}`, "d");

  let match;
  let i = 0;
  while ((match = text.slice(i).match(regex)) !== null) {
    if (!match.indices) {
      continue;
    }

    const [[start, end]] = match.indices;
    const position: StartEndIndx = [i + start, i + end];
    placeholders.push(position);
    i = position[1];
  }

  return placeholders;
};
