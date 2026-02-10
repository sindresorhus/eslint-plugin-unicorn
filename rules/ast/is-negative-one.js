import {isNumericLiteral} from './literal.js';

export default function isNegativeOne(node) {
	return node?.type === 'UnaryExpression'
		&& node.operator === '-'
		&& isNumericLiteral(node.argument)
		&& node.argument.value === 1;
}
