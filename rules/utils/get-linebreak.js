/**
@import * as ESLint from 'eslint';
*/

const linebreakPattern = /\r\n|[\n\r\u2028\u2029]/;

/**
Get the line ending the file uses, for fixes that insert new lines.

The first line ending in the file is used. Falls back to `\n` when the file is a single line.

@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {string}
*/
export default function getLinebreak(context) {
	return context.sourceCode.text.match(linebreakPattern)?.[0] ?? '\n';
}
