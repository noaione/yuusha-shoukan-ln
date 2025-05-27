// A collection of verification functions for various purposes.
// Mainly to help catch some errors.

import type { Paragraph, Root } from 'mdast';
import { toString } from 'mdast-util-to-string';

const BALANCED_BRACKETS: Record<string, string> = {
  '[': ']',
  '(': ')',
  '{': '}',
  '<': '>',
};
const BALANCED_QUOTES: Record<string, string> = {
  '"': '"',
  "'": "'",
  '“': '”',
  '‘': '’',
};
const REVERSED_BALANCED_BRACKETS = Object.fromEntries(
  Object.entries(BALANCED_BRACKETS).map(([k, v]) => [v, k]),
);
const REVERSED_BALANCED_QUOTES = Object.fromEntries(Object.entries(BALANCED_QUOTES).map(([k, v]) => [v, k]));

const DISALLOWED_CTX = [
  // Elipsis characters
  '…', // U+2026 HORIZONTAL ELLIPSIS -> ...
  '‥', // U+2025 TWO DOT LEADER -> ..
  '⁞', // U+205F VERTICAL FOUR DOTS -> ....
  '–', // U+2013 EN DASH -> -
  '&#160;', // U+00A0 NO-BREAK SPACE -> &nbsp;
  '&nbsp;', // HTML entity for non-breaking space
  '　', // U+3000 IDEOGRAPHIC SPACE -> full-width space
];

function checkBalancing(first: string, last: string, expectFirst?: string, expectLast?: string) {
  if (expectFirst && expectLast) {
    return first === last && expectFirst === expectLast;
  }
  if (expectFirst || expectLast) {
    return false; // If one of the expectations is missing, we consider it unbalanced
  }
  return true; // If no expectations, we consider it balanced
}

function cleanupParagraphText(text: string): string {
  // Compile all into single line of string
  const mergedLine = text.replace(/\n/g, ' ').trim();
  // Strip dash, en-dash, em-dash, elipsis (sometimes can be more than one dot) from the start and end
  return mergedLine.replace(/^([-–—\s]+|[\.]+)|([-–—\s]+|[\.]+)$/gm, '').trim();
}

export function isParagraphBalancedQuotesBrackets(paragraph: Paragraph): boolean {
  if (paragraph.type !== 'paragraph') {
    return true; // Not a paragraph, so we consider it balanced
  }

  const text = toString(paragraph);
  const strippedText = cleanupParagraphText(text);
  if (!strippedText.length) {
    return true; // Empty paragraph is considered balanced
  }

  const peekFirst = strippedText[0]!;
  const peekLast = strippedText[strippedText.length - 1]!;
  // First check first === last
  const peekFirstBracket = BALANCED_BRACKETS[peekFirst];
  const peekLastBracket = REVERSED_BALANCED_BRACKETS[peekLast];
  const balancedBrackets = checkBalancing(peekFirst, peekLast, peekFirstBracket, peekLastBracket);
  if (balancedBrackets) {
    return true; // If brackets are balanced, we can skip quotes check
  }
  const peekFirstQuote = BALANCED_QUOTES[peekFirst];
  const peekLastQuote = REVERSED_BALANCED_QUOTES[peekLast];

  const balancedQuotes = checkBalancing(peekFirst, peekLast, peekFirstQuote, peekLastQuote);
  if (balancedQuotes) {
    return true;
  }
  console.warn(`!!! Paragraph is not balanced: ${text}`);
  return false;
}

export function isParagraphUsingCorrectQuotesBrackets(paragraph: Paragraph): boolean {
  if (paragraph.type !== 'paragraph') {
    return true; // Not a paragraph, so we consider it correct
  }

  const text = toString(paragraph);
  const strippedText = cleanupParagraphText(text);
  const peakFirst = strippedText[0]!;
  if (REVERSED_BALANCED_BRACKETS[peakFirst]) {
    // If first character is a closing bracket, it's incorrect
    console.warn(`!!! Paragraph starts with a closing bracket: ${text}`);
    return false;
  }
  if (REVERSED_BALANCED_QUOTES[peakFirst]) {
    // If first character is a closing quote, it's incorrect
    console.warn(`!!! Paragraph starts with a closing quote: ${text}`);
    return false;
  }
  const peakLast = strippedText[strippedText.length - 1]!;
  if (BALANCED_BRACKETS[peakLast]) {
    // If last character is an opening bracket, it's incorrect
    console.warn(`!!! Paragraph ends with an opening bracket: ${text}`);
    return false;
  }
  if (BALANCED_QUOTES[peakLast]) {
    // If last character is an opening quote, it's incorrect
    console.warn(`!!! Paragraph ends with an opening quote: ${text}`);
    return false;
  }

  return true; // If no issues found, we consider it correct
}

export function isParagraphHasQuotesInQuotes(paragraph: Paragraph): boolean {
  if (paragraph.type !== 'paragraph') {
    return true; // Not a paragraph, so we consider it correct
  }

  const text = toString(paragraph);
  const strippedText = cleanupParagraphText(text);
  if (!strippedText.length) {
    return true; // Empty paragraph is considered correct
  }

  const openWith = ['"', '“'];
  const closeWith = ['"', '”'];
  const openQuote = strippedText[0]!;
  const closeQuote = strippedText[strippedText.length - 1]!;
  const isQuoted = openWith.includes(openQuote) && closeWith.includes(closeQuote);

  if (!isQuoted) {
    return true; // Not a quoted paragraph, so we consider it correct
  }

  // Check inside if there are same quotes (either open or close)
  const hasQuotes = [...openWith, ...closeWith];
  const insideText = strippedText.slice(1, -1);
  if (hasQuotes.some((quote) => insideText.includes(quote))) {
    console.warn(`!!! Paragraph has quotes inside quotes: ${text}`);
    return false; // If there are quotes inside quotes, it's incorrect
  }
  return true; // If no issues found, we consider it correct
}

export function isParagraphDisallowedCtx(paragraph: Paragraph): boolean {
  if (paragraph.type !== 'paragraph') {
    return true; // Not a paragraph, so we consider it correct
  }

  const text = toString(paragraph);
  const strippedText = cleanupParagraphText(text);
  if (!strippedText.length) {
    return true; // Empty paragraph is considered correct
  }

  for (const ctx of DISALLOWED_CTX) {
    if (strippedText.includes(ctx)) {
      console.warn(`!!! Paragraph contains disallowed stuff: ${ctx} in \`${text}\``);
      return false; // If disallowed context is found, it's incorrect
    }
  }
  return true; // If no issues found, we consider it correct
}

export function doVerificationOfMarkdown(root: Root): boolean {
  if (root.type !== 'root') {
    return true; // Not a root, so we consider it verified
  }

  for (const node of root.children) {
    if (node.type === 'paragraph') {
      isParagraphBalancedQuotesBrackets(node);
      isParagraphUsingCorrectQuotesBrackets(node);
      isParagraphHasQuotesInQuotes(node);
    }
  }

  return true; // Valid
}
