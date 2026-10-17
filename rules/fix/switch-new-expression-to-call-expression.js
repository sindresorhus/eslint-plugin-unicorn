import {
	isNewExpressionWithParentheses,
	getUnparenthesizedKeywordArgumentParent,
	needsSemicolon,
	isOnSameLine,
} from '../utils/index.js';
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
	const {sourceCode} = context;
	const newToken = sourceCode.getFirstToken(newExpression);
	const shouldParenthesize = !isOnSameLine(newToken, newExpression.callee, context)
		&& Boolean(getUnparenthesizedKeywordArgumentParent(newExpression, context));
	yield fixer.replaceText(newToken, shouldParenthesize ? '(' : '');
	yield removeSpaceAfter(newToken, context, fixer);

	if (!isNewExpressionWithParentheses(newExpression, context)) {
		yield fixer.insertTextAfter(newExpression, '()');
	}

	/*
		Removing `new` from this code would make the function return `undefined`.

		```js
			() => {
				return new // comment
					Foo()
			}
		```
	*/
	if (shouldParenthesize) {
		// Group the replacement before its leading comment, including when a surrounding expression is returned, thrown, or yielded.
		yield fixer.insertTextAfter(newExpression, ')');
	}

	const nextToken = sourceCode.getTokenAfter(newToken);
	if (needsSemicolon(sourceCode.getTokenBefore(newExpression), context, nextToken.value)) {
		yield fixer.insertTextBefore(newExpression, ';');
	}
}
