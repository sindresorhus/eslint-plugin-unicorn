import getCallExpressionTokens from './get-call-expression-tokens.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
Get the text of the arguments list of `CallExpression`.

@param {import('eslint').SourceCode} sourceCode - The source code object.
@param {ESTree.CallExpression} callExpression - The `CallExpression` node.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {string}
*/
export default function getCallExpressionArgumentsText(context, callExpression) {
	const {sourceCode} = context;
	const {
		openingParenthesisToken,
		closingParenthesisToken,
	} = getCallExpressionTokens(callExpression, context);

	const [, start] = sourceCode.getRange(openingParenthesisToken);
	const [end] = sourceCode.getRange(closingParenthesisToken);

	return sourceCode.text.slice(start, end);
}
