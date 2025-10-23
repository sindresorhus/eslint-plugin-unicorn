import {isOpeningParenToken, isCommaToken} from '@eslint-community/eslint-utils';
import isNewExpressionWithParentheses from './is-new-expression-with-parentheses.js';

/** @typedef {import('estree').CallExpression} CallExpression */
/** @typedef {import('eslint').AST.Token} Token */

/**
Get the `openingParenthesisToken`, `closingParenthesisToken`, and `trailingCommaToken` of `CallExpression`.

@param {import('eslint').SourceCode} sourceCode - The source code object.
@param {CallExpression} callOrNewExpression - The `CallExpression` or `newExpression` node.
@returns {{
	openingParenthesisToken?: Token,
	closingParenthesisToken?: Token,
	trailingCommaToken?: Token,
}}
*/
function getCallOrNewExpressionTokens(sourceCode, callOrNewExpression) {
	const startToken = callOrNewExpression.typeArguments ?? callOrNewExpression.callee;
	const openingParenthesisToken = sourceCode.getTokenAfter(startToken, isOpeningParenToken);
	const [
		penultimateToken,
		closingParenthesisToken,
	] = sourceCode.getLastTokens(callOrNewExpression, 2);
	const trailingCommaToken = isCommaToken(penultimateToken) ? penultimateToken : undefined;

	return {
		openingParenthesisToken,
		closingParenthesisToken,
		trailingCommaToken,
	};
}

function getNewExpressionTokens(souceCode, newExpression) {
	if (!isNewExpressionWithParentheses(newExpression, souceCode)) {
		return {};
	}

	return getCallOrNewExpressionTokens(souceCode, newExpression);
}

export {getCallOrNewExpressionTokens as getCallExpressionTokens, getNewExpressionTokens};
