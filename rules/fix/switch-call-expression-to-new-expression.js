import {isParenthesized} from '../utils/parentheses.js';
import shouldAddParenthesesToNewExpressionCallee from '../utils/should-add-parentheses-to-new-expression-callee.js';
import fixSpaceAroundKeyword from './fix-space-around-keywords.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**

@param {ESTree.CallExpression} node
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@param {ESLint.Rule.RuleFixer} fixer
@returns {ESLint.Rule.ReportFixer}
*/
export default function * switchCallExpressionToNewExpression(node, context, fixer) {
	yield fixSpaceAroundKeyword(fixer, node, context);
	yield fixer.insertTextBefore(node, 'new ');

	const {callee} = node;
	if (
		!isParenthesized(callee, context.sourceCode)
		&& shouldAddParenthesesToNewExpressionCallee(callee)
	) {
		yield fixer.insertTextBefore(callee, '(');
		yield fixer.insertTextAfter(callee, ')');
	}
}
