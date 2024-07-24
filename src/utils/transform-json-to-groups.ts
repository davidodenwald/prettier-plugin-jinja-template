import { placeholderGenerator, replaceAt } from "./placeholder-generator";
import { findPlaceholders } from "./find-placeholders";
import { replacePlaceholders } from "./replace-placeholders";

const STYLE = "json" as const;

export const transformJsonToGroups = (input: string): string[] => {
  // const jsonRegex = /\{[^{}]*\}|\[[^\[\]]*\]/;
  const jsonRegex = /({[^{}]*})/;

  let match;
  let content = input;
  const placeholderGen = placeholderGenerator(content, STYLE);
  const placeholders: Record<string, string> = {};

  // replace valid jsons groups by placeholders
  while ((match = content.match(jsonRegex)) !== null) {
    const startMatch = match.index;

    if (startMatch === undefined) {
      continue;
    }

    const matchText = match[0];

    const placeholder = placeholderGen();
    placeholders[placeholder] = matchText;
    content = replaceAt(content, placeholder, startMatch, matchText.length);
  }

  const idsPlaceholders = findPlaceholders(content, STYLE);

  if (!idsPlaceholders.length) {
    return [content];
  }

  const groups: string[] = [];
  let startIndex = 0;

  idsPlaceholders.forEach(([start, end]) => {
    const notJsonContent = content.slice(startIndex, start);
    if (notJsonContent) {
      groups.push(notJsonContent);
    }
    startIndex = end;

    const placeholder = content.slice(start, end);
    const placeholderValue = placeholders[placeholder];
    const readyJson = replacePlaceholders(placeholderValue, placeholders);

    groups.push(readyJson);
  });

  const lastIndex = content.length;
  const notJsonContent = content.slice(startIndex, lastIndex);
  if (notJsonContent && startIndex < lastIndex) {
    groups.push(notJsonContent);
  }

  return groups;
};
