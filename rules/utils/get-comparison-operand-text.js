import {getParenthesizedText, isParenthesized} from './parentheses/parentheses.js';

/**
Get the right comparison operand text, grouping TypeScript assertions when a relational operator would otherwise capture them.
*/
export default function getComparisonOperandText(node, context, operator) {
	const text = getParenthesizedText(node, context);
	return !isParenthesized(node, context)
		&& ['<', '<=', '>', '>='].includes(operator)
		&& ['TSAsExpression', 'TSSatisfiesExpression'].includes(node.type)
		? `(${text})`
		: text;
}
