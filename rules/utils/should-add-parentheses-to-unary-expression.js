/**
Check if parentheses should be added to a `node` when it's used as `argument` of `UnaryExpression`.

@param {Node} node - The AST node to check.
@param {string} operator - The UnaryExpression operator.
@returns {boolean}
*/
export default function shouldAddParenthesesToUnaryExpressionArgument(node, operator) {
	// Only support `!` operator
	if (operator !== '!') {
		throw new Error('Unexpected operator');
	}

	return [
		'UpdateExpression',
		'BinaryExpression',
		'LogicalExpression',
		'ConditionalExpression',
		'AssignmentExpression',
		'ArrowFunctionExpression',
		'YieldExpression',
		'SequenceExpression',
	].includes(node.type);
}
