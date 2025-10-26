import {isOpeningParenToken, isCommaToken} from '@eslint-community/eslint-utils';
import isNewExpressionWithParentheses from './is-new-expression-with-parentheses.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@typedef {{
	openingParenthesisToken: ESLint.AST.Token,
	closingParenthesisToken: ESLint.AST.Token,
	trailingCommaToken: ESLint.AST.Token | undefined,
}} Tokens
*/

/**
Get the `openingParenthesisToken`, `closingParenthesisToken`, and `trailingCommaToken` of `CallExpression`.

@param {ESTree.CallExpression | ESTree.NewExpression} callOrNewExpression - The `CallExpression` or `newExpression` node.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {Tokens}
*/
function getCallOrNewExpressionTokens(callOrNewExpression, context) {
	const {sourceCode} = context;
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

/**
Get the `openingParenthesisToken`, `closingParenthesisToken`, and `trailingCommaToken` of `NewExpression`.

@param {ESTree.NewExpression} newExpression - The `newExpression` node.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {Tokens}
*/
function getNewExpressionTokens(newExpression, context) {
	if (!isNewExpressionWithParentheses(newExpression, context)) {
		return {};
	}

	return getCallOrNewExpressionTokens(newExpression, context);
}

/**
Get the `openingParenthesisToken`, `closingParenthesisToken`, and `trailingCommaToken` of `CallExpression`.

@param {ESTree.CallExpression} callExpression - The `callExpression` node.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {Tokens}
*/
function getCallExpressionTokens(callExpression, context) {
	return getCallOrNewExpressionTokens(callExpression, context);
}

export {getCallExpressionTokens, getNewExpressionTokens};
