import isNewExpressionWithParentheses from '../utils/is-new-expression-with-parentheses.js';
import {isParenthesized} from '../utils/parentheses.js';
import isOnSameLine from '../utils/is-on-same-line.js';
import addParenthesizesToReturnOrThrowExpression from './add-parenthesizes-to-return-or-throw-expression.js';
import removeSpaceAfter from './remove-spaces-after.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@param {ESTree.NewExpression} newExpression
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@param {ESLint.Rule.RuleFixer} fixer
@returns {ESLint.Rule.ReportFixer}
*/
export default function * switchNewExpressionToCallExpression(newExpression, context, fixer) {
	const newToken = context.sourceCode.getFirstToken(newExpression);
	yield fixer.remove(newToken);
	yield removeSpaceAfter(newToken, context, fixer);

	if (!isNewExpressionWithParentheses(newExpression, context)) {
		yield fixer.insertTextAfter(newExpression, '()');
	}

	/*
		Remove `new` from this code will makes the function return `undefined`

		```js
			() => {
				return new // comment
					Foo()
			}
		```
	*/
	if (!isOnSameLine(newToken, newExpression.callee, context) && !isParenthesized(newExpression, context.sourceCode)) {
		// Ideally, we should use first parenthesis of the `callee`, and should check spaces after the `new` token
		// But adding extra parentheses is harmless, no need to be too complicated
		yield addParenthesizesToReturnOrThrowExpression(fixer, newExpression.parent, context);
	}
}
