import {isCommaToken} from '@eslint-community/eslint-utils';
import {getParentheses} from '../utils/parentheses.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@param {ESLint.Rule.RuleFixer} fixer
@param {ESTree.NewExpression | ESTree.CallExpression} node
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {ESLint.Rule.ReportFixer}
*/
export default function removeArgument(fixer, node, context) {
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

	return fixer.removeRange([start, end]);
}
