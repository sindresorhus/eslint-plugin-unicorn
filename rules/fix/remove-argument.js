import {isCommaToken} from '@eslint-community/eslint-utils';
import {getParentheses} from '../utils/index.js';

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

	if (index !== 0) {
		const commaToken = sourceCode.getTokenBefore(firstToken);
		[start] = sourceCode.getRange(commaToken);
	}

	// If the removed argument is the only argument, the trailing comma must be removed too
	if (callOrNewExpression.arguments.length === 1) {
		const tokenAfter = sourceCode.getTokenAfter(lastToken);
		if (isCommaToken(tokenAfter)) {
			[, end] = sourceCode.getRange(tokenAfter);
		}
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
	return fixer.removeRange(getArgumentRemovalRange(node, context));
}

export {
	getArgumentRemovalRange,
};
