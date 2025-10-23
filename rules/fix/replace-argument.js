import {getParenthesizedRange} from '../utils/parentheses.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@param {ESLint.Rule.RuleFixer} fixer
@param {ESTree.CallExpression | ESTree.NewExpression} node
@param {string} text
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {ESLint.Rule.ReportFixer}
*/
export default function replaceArgument(fixer, node, text, context) {
	return fixer.replaceTextRange(getParenthesizedRange(node, context), text);
}
