import {getParenthesizedRange} from '../utils/parentheses.js';

export default function removeMemberExpressionProperty(fixer, memberExpression, sourceCode) {
	const [, start] = getParenthesizedRange(memberExpression.object, sourceCode);
	const [, end] = memberExpression.range;
	return fixer.removeRange([start, end]);
}
