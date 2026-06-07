/**
Check if parentheses should be added to a `node` when it's used as `argument` of `AwaitExpression`.

@param {Node} node - The AST node to check.
@returns {boolean}
*/
export default function shouldAddParenthesesToAwaitExpressionArgument(node) {
	return [
		'SequenceExpression',
		'YieldExpression',
		'ArrowFunctionExpression',
		'ConditionalExpression',
		'AssignmentExpression',
		'LogicalExpression',
		'BinaryExpression',
	].includes(node.type);
}
