// A collection of verification functions for various purposes.
// Mainly to help catch some errors.

import type { Paragraph, Root } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { tr } from 'zod/v4/locales';

const BALANCED_BRACKETS = {
  '[': ']',
  '(': ')',
  '{': '}',
  '<': '>',
};
const BALANCED_QUOTES = {
  '"': '"',
  "'": "'",
  '“': '”',
  '‘': '’',
};
const REVERSED_BALANCED_BRACKETS = Object.fromEntries(
  Object.entries(BALANCED_BRACKETS).map(([k, v]) => [v, k]),
);
const REVERSED_BALANCED_QUOTES = Object.fromEntries(Object.entries(BALANCED_QUOTES).map(([k, v]) => [v, k]));

function checkBalancing(first: string, last: string, expectFirst?: string, expectLast?: string) {
  if (expectFirst && expectLast) {
    return first === last && expectFirst === expectLast;
  }
  if (expectFirst) {
    return first === last && expectFirst === last;
  }
  if (expectLast) {
    return first === last && expectFirst === first;
  }
  return true; // If no expectations, we consider it balanced
}

export function isParagraphBalancedQuotesBrackets(paragraph: Paragraph): boolean {
  if (paragraph.type !== 'paragraph') {
    return true; // Not a paragraph, so we consider it balanced
  }

  // Compile all into single line of string
  const text = toString(paragraph).replace(/\n/g, ' ').trim();
  // Strip dash, en-dash, em-dash, elipsis (sometimes can be more than one dot) from the start and end
  const strippedText = text.replace(/^([-–—\s]+|[\.]+)|([-–—\s]+|[\.]+)$/gm, '').trim();

  if (!strippedText.length) {
    return true; // Empty paragraph is considered balanced
  }

  const peekFirst = strippedText[0]!;
  const peekLast = strippedText[strippedText.length - 1]!;
  // First check first === last
  const peekFirstBracket = BALANCED_BRACKETS[peekFirst as keyof typeof BALANCED_BRACKETS];
  const peekLastBracket = REVERSED_BALANCED_BRACKETS[peekLast];
  const balancedBrackets = checkBalancing(peekFirst, peekLast, peekFirstBracket, peekLastBracket);
  if (balancedBrackets) {
    return true; // If brackets are balanced, we can skip quotes check
  }
  const peekFirstQuote = BALANCED_QUOTES[peekFirst as keyof typeof BALANCED_QUOTES];
  const peekLastQuote = REVERSED_BALANCED_QUOTES[peekLast];

  const balancedQuotes = checkBalancing(peekFirst, peekLast, peekFirstQuote, peekLastQuote);
  return balancedQuotes; // Return true if quotes are balanced
}

export function doVerificationOfMarkdown(root: Root): boolean {
  if (root.type !== 'root') {
    return true; // Not a root, so we consider it verified
  }

  for (const node of root.children) {
    if (!isParagraphBalancedQuotesBrackets(node as Paragraph)) {
      console.warn(`!!! Paragraph is not balanced: ${toString(node as Paragraph)}`);
      return false; // If any paragraph is not balanced, return false
    }
  }

  return true; // Valid
}
