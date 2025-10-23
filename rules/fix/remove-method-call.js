import {getParenthesizedRange} from '../utils/parentheses.js';
import {removeMemberExpressionProperty} from './replace-member-expression-property.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@param {ESLint.Rule.RuleFixer} fixer
@param {ESTree.CallExpression} callExpression
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {ESLint.Rule.ReportFixer}
*/
export default function * removeMethodCall(fixer, callExpression, context) {
	const memberExpression = callExpression.callee;

	// `(( (( foo )).bar ))()`
	//              ^^^^
	yield removeMemberExpressionProperty(fixer, memberExpression, context);

	// `(( (( foo )).bar ))()`
	//                     ^^
	const [, start] = getParenthesizedRange(memberExpression, context);
	const [, end] = context.sourceCode.getRange(callExpression);

	yield fixer.removeRange([start, end]);
}
