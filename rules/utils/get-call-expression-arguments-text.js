'use strict';
const getCallExpressionTokens = require('./get-call-expression-tokens.js');

/** @typedef {import('estree').CallExpression} CallExpression */

/**
Get the text of the arguments list of `CallExpression`.

@param {import('eslint').SourceCode} sourceCode - The source code object.
@param {CallExpression} callExpression - The `CallExpression` node.
@param {SourceCode} sourceCode - The source code object.
@returns {string}
*/
function getCallExpressionArgumentsText(sourceCode, callExpression) {
	const {
		openingParenthesisToken,
		closingParenthesisToken,
	} = getCallExpressionTokens(sourceCode, callExpression);

	return sourceCode.text.slice(
		openingParenthesisToken.range[1],
		closingParenthesisToken.range[0],
	);
}

module.exports = getCallExpressionArgumentsText;
