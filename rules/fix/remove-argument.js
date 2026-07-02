import {isCommaToken} from '@eslint-community/eslint-utils';
import {getParentheses, hasCommentInRange} from '../utils/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@param {ESTree.CallExpressionArgument} node
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {Array<number>}
*/
function getArgumentRemovalRange(node, context) {
	const callOrNewExpression = node.parent;
	const index = callOrNewExpression.arguments.indexOf(node);
	const parentheses = getParentheses(node, context);
	const firstToken = parentheses[0] || node;
	const lastToken = parentheses.at(-1) || node;
	const {sourceCode} = context;

	let [start] = sourceCode.getRange(firstToken);
	let [, end] = sourceCode.getRange(lastToken);

	if (callOrNewExpression.arguments.length === 1) {
		// The only argument: also drop a dangling trailing comma if present (`fn(a,)`).
		const tokenAfter = sourceCode.getTokenAfter(lastToken);
		if (isCommaToken(tokenAfter)) {
			[, end] = sourceCode.getRange(tokenAfter);
		}
	} else if (index === 0) {
		// First of several: remove it through the following comma and the gap after it, so
		// `fn(a, b)` becomes `fn(b)` rather than `fn( b)`.
		const commaToken = sourceCode.getTokenAfter(lastToken);
		const tokenAfterComma = sourceCode.getTokenAfter(commaToken, {includeComments: true});
		[end] = sourceCode.getRange(tokenAfterComma);
	} else {
		// Otherwise remove the comma that precedes it.
		const commaToken = sourceCode.getTokenBefore(firstToken);
		[start] = sourceCode.getRange(commaToken);
	}

	return [start, end];
}

/**
@param {ESLint.Rule.RuleFixer} fixer
@param {ESTree.CallExpressionArgument} node
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {ESLint.Rule.Fix}
*/
export default function removeArgument(fixer, node, context) {
	const removalRange = getArgumentRemovalRange(node, context);
	const callOrNewExpression = node.parent;
	const index = callOrNewExpression.arguments.indexOf(node);

	if (
		index === 0
		&& callOrNewExpression.arguments.length > 1
		&& hasCommentInRange(context, removalRange)
	) {
		const {sourceCode} = context;
		const parentheses = getParentheses(node, context);
		const lastToken = parentheses.at(-1) || node;
		const [, argumentEnd] = sourceCode.getRange(lastToken);
		const commaToken = sourceCode.getTokenAfter(lastToken);
		const [commaStart, commaEnd] = sourceCode.getRange(commaToken);
		const rangeText = sourceCode.text.slice(...removalRange);
		const replacement = rangeText.slice(argumentEnd - removalRange[0], commaStart - removalRange[0]) + rangeText.slice(commaEnd - removalRange[0]);

		return fixer.replaceTextRange(removalRange, replacement);
	}

	return fixer.removeRange(removalRange);
}

export {
	getArgumentRemovalRange,
};
