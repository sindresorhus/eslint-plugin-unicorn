import {getCallExpressionTokens} from './get-call-or-new-expression-tokens.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
Get the text of the arguments list of `CallExpression`.

@param {ESTree.CallExpression} callExpression - The `CallExpression` node.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@param {boolean} [includeTrailingComma = true] - Whether the trailing comma should be included.
@returns {string}
*/
export default function getCallExpressionArgumentsText(
	context,
	callExpression,
	includeTrailingComma = true,
) {
	const {sourceCode} = context;
	const {
		openingParenthesisToken,
		closingParenthesisToken,
		trailingCommaToken,
	} = getCallExpressionTokens(callExpression, context);

	const [, start] = sourceCode.getRange(openingParenthesisToken);
	const [end] = sourceCode.getRange(
		includeTrailingComma
			? closingParenthesisToken
			: (trailingCommaToken ?? closingParenthesisToken),
	);

	return sourceCode.text.slice(start, end);
}
