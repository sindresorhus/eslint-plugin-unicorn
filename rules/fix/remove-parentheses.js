import {getParentheses} from '../utils/parentheses.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@param {ESTree.Node} node
@param {ESLint.Rule.RuleFixer} fixer
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {ESLint.Rule.ReportFixer}
*/
export default function * removeParentheses(node, fixer, context) {
	const parentheses = getParentheses(node, context);
	for (const token of parentheses) {
		yield fixer.remove(token);
	}
}
