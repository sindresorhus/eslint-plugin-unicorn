import {getParenthesizedText, isParenthesized} from './parentheses/parentheses.js';

/**
Get comparison operand text with TypeScript assertions grouped so they continue to apply to the operand.
*/
export default function getComparisonOperandText(node, context) {
	const text = getParenthesizedText(node, context);
	return !isParenthesized(node, context) && ['TSAsExpression', 'TSSatisfiesExpression'].includes(node.type)
		? `(${text})`
		: text;
}
