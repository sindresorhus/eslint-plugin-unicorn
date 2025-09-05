import {getParenthesizedRange} from '../utils/parentheses.js';

export function replaceMemberExpressionProperty(fixer, memberExpression, sourceCode, text) {
	const [, start] = getParenthesizedRange(memberExpression.object, sourceCode);
	const [, end] = sourceCode.getRange(memberExpression);
	return fixer.replaceTextRange([start, end], text);
}

export const removeMemberExpressionProperty = (fixer, memberExpression, sourceCode) => replaceMemberExpressionProperty(fixer, memberExpression, sourceCode, '');
