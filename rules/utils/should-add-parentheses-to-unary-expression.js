/**
Check if parentheses should be added to a `node` when it's used as `argument` of `UnaryExpression`.

@param {Node} node - The AST node to check.
@param {string} operator - The UnaryExpression operator.
@returns {boolean}
*/
// Prefix unary operators all share the same precedence, so the same parenthesization rules apply.
const supportedOperators = new Set(['!', 'typeof', 'void', 'delete', '~', '+', '-']);

export default function shouldAddParenthesesToUnaryExpressionArgument(node, operator) {
	if (!supportedOperators.has(operator)) {
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
		'TSAsExpression',
		'TSSatisfiesExpression',
		'TSNonNullExpression',
		'TSTypeAssertion',
	].includes(node.type);
}
