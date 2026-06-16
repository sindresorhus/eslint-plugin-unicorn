import {getParenthesizedRange} from './parentheses/parentheses.js';

/**
Get the range of the member access operator (the `.`, `?.`, or `[` … `]`) of a member expression.

@param {object} memberExpression
@param {import('eslint').Rule.RuleContext} context
@returns {Array<number>}
*/
export function getMemberAccessOperatorRange(memberExpression, context) {
	const {sourceCode} = context;
	const [, start] = getParenthesizedRange(memberExpression.object, context);
	const end = memberExpression.computed
		? sourceCode.getRange(sourceCode.getTokenBefore(memberExpression.property, token => token.value === '['))[1]
		: sourceCode.getRange(memberExpression.property)[0];

	return [start, end];
}
