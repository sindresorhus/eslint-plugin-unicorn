const arithmeticAndBitwiseOperators = new Set(['+', '-', '*', '/', '%', '**', '<<', '>>', '>>>', '&', '^', '|']);

/**
Get the arithmetic or bitwise operator of a binary expression or compound assignment. For example, `+=` becomes `+`. Plain and logical assignments return `undefined`.
*/
export function getArithmeticOrBitwiseOperator(node) {
	let {operator} = node;
	if (node.type === 'AssignmentExpression') {
		operator = operator.slice(0, -1);
	} else if (node.type !== 'BinaryExpression') {
		return;
	}

	return arithmeticAndBitwiseOperators.has(operator) ? operator : undefined;
}

export const isNumericUnaryOperator = operator => ['+', '-', '~'].includes(operator);
