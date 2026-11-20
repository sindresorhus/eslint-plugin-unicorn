/**
@import * as ESLint from 'eslint';
*/

export const linebreakPattern = /\r\n|[\n\r\u{2028}\u{2029}]/v;

/**
Get the line ending the file uses, for fixes that insert new lines.

The first line ending in the file is used. Falls back to `\n` when the file is a single line.

@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {string}
*/
export default function getLinebreak(context) {
	return context.sourceCode.text.match(linebreakPattern)?.[0] ?? '\n';
}
