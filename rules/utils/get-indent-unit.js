import detectIndent from 'detect-indent';

/**
@import * as ESLint from 'eslint';
*/

const cache = new WeakMap();

const detectIndentUnit = context => {
	const {sourceCode} = context;
	// Continuation lines of multi-line tokens (template literals, block comments, JSX text) do not follow the file's indentation, so they are blanked before detection.
	const lines = [...sourceCode.lines];
	for (const token of sourceCode.getTokens(sourceCode.ast, {includeComments: true})) {
		const {start, end} = sourceCode.getLoc(token);
		if (start.line !== end.line) {
			lines.fill('', start.line, end.line);
		}
	}

	const {type, indent} = detectIndent(lines.join('\n'));
	return type === 'space' ? indent : '\t';
};

/**
Get one level of indentation in the file, for fixes that insert new indented lines.

The unit is the most common indentation step in the file. Falls back to a tab when the file has no indented lines.

@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {string}
*/
export default function getIndentUnit(context) {
	const {sourceCode} = context;
	let indentUnit = cache.get(sourceCode);
	if (indentUnit === undefined) {
		indentUnit = detectIndentUnit(context);
		cache.set(sourceCode, indentUnit);
	}

	return indentUnit;
}
