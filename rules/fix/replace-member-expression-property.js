import {getParenthesizedRange} from '../utils/parentheses.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@param {ESTree.MemberExpression} memberExpression - The `MemberExpression` to fix.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@param {string} text
@returns {ESLint.Rule.ReportFixer}
*/
export function replaceMemberExpressionProperty(fixer, memberExpression, context, text) {
	const [, start] = getParenthesizedRange(memberExpression.object, context);
	const [, end] = context.sourceCode.getRange(memberExpression);
	return fixer.replaceTextRange([start, end], text);
}

/**
@param {ESTree.MemberExpression} memberExpression - The `MemberExpression` to fix.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {ESLint.Rule.ReportFixer}
*/
export const removeMemberExpressionProperty = (fixer, memberExpression, context) => replaceMemberExpressionProperty(fixer, memberExpression, context, '');
