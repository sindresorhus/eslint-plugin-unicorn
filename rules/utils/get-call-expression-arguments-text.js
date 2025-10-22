import getCallExpressionTokens from './get-call-expression-tokens.js';

/** @typedef {import('estree').CallExpression} CallExpression */

/**
Get the text of the arguments list of `CallExpression`.

@param {import('eslint').SourceCode} sourceCode - The source code object.
@param {CallExpression} callExpression - The `CallExpression` node.
@param {SourceCode} sourceCode - The source code object.
@param {SourceCode} [includeTrailingComma = true] - Whether the trailing comma should be included.
@returns {string}
*/
export default function getCallExpressionArgumentsText(
	sourceCode,
	callExpression,
	includeTrailingComma = true,
) {
	const {
		openingParenthesisToken,
		closingParenthesisToken,
		trailingCommaToken,
	} = getCallExpressionTokens(sourceCode, callExpression);

	const [, start] = sourceCode.getRange(openingParenthesisToken);
	const [end] = sourceCode.getRange(
		includeTrailingComma
			? closingParenthesisToken
			: (trailingCommaToken ?? closingParenthesisToken),
	);

	return sourceCode.text.slice(start, end);
}
