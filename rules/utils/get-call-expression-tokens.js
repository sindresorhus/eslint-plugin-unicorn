import {isOpeningParenToken, isCommaToken} from '@eslint-community/eslint-utils';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
Get the `openingParenthesisToken`, `closingParenthesisToken`, and `trailingCommaToken` of `CallExpression`.

@param {ESTree.CallExpression} callExpression - The `CallExpression` node.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {{
	openingParenthesisToken: ESLint.AST.Token,
	closingParenthesisToken: ESLint.AST.Token,
	trailingCommaToken: ESLint.AST.Token | undefined,
}}
*/
export default function getCallExpressionTokens(callExpression, context) {
	const {sourceCode} = context;
	const openingParenthesisToken = sourceCode.getTokenAfter(callExpression.callee, isOpeningParenToken);
	const [
		penultimateToken,
		closingParenthesisToken,
	] = sourceCode.getLastTokens(callExpression, 2);
	const trailingCommaToken = isCommaToken(penultimateToken) ? penultimateToken : undefined;

	return {
		openingParenthesisToken,
		closingParenthesisToken,
		trailingCommaToken,
	};
}
