/**
Check if parentheses should be added to a `node` when it's used as `callee` of `CallExpression`.

@param {Node} node - The AST node to check.
@returns {boolean}
*/
export default function shouldAddParenthesesToCallExpressionCallee(node) {
	return [
		'SequenceExpression',
		'YieldExpression',
		'ArrowFunctionExpression',
		'ConditionalExpression',
		'AssignmentExpression',
		'LogicalExpression',
		'BinaryExpression',
		'UnaryExpression',
		'UpdateExpression',
		'NewExpression',
	].includes(node.type);
}
