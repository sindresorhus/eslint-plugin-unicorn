/**
Check if the given node is a true logical expression or not.

The three binary expressions logical-or (`||`), logical-and (`&&`), and coalesce (`??`) are known as `ShortCircuitExpression`, but ESTree represents these by the `LogicalExpression` node type. This function rejects coalesce expressions of `LogicalExpression` node type.

@param {Node} node - The node to check.
@returns {boolean} `true` if the node is `&&` or `||`.
@see https://tc39.es/ecma262/#prod-ShortCircuitExpression
*/
const isLogicalExpression = node =>
	node?.type === 'LogicalExpression'
	&& (node.operator === '&&' || node.operator === '||');

export default isLogicalExpression;

/**
Get the operands of a chain of logical expressions with the same operator, flattened from left to right. For example, `a && (b && c)` with `&&` returns `[a, b, c]`.

Returns `[node]` if `node` is not a `LogicalExpression` with the given operator. TypeScript expression wrappers are not unwrapped.

@param {Node} node
@param {'&&' | '||' | '??'} operator
@returns {Node[]}
*/
export function getLogicalExpressionOperands(node, operator) {
	if (
		node?.type !== 'LogicalExpression'
		|| node.operator !== operator
	) {
		return [node];
	}

	return [
		...getLogicalExpressionOperands(node.left, operator),
		...getLogicalExpressionOperands(node.right, operator),
	];
}

/**
Get the outermost logical expression with the given operator that contains `node` as an operand, or `node` itself if its parent is not such a logical expression.

@param {Node} node
@param {'&&' | '||' | '??'} operator
@returns {Node}
*/
export function getLogicalExpressionRoot(node, operator) {
	while (
		node.parent.type === 'LogicalExpression'
		&& node.parent.operator === operator
	) {
		node = node.parent;
	}

	return node;
}

/**
Check if a `LogicalExpression` is not an operand of a parent logical expression with the same operator.

@param {Node} node - A `LogicalExpression` node.
@returns {boolean}
*/
export const isOutermostLogicalExpression = node =>
	node.parent.type !== 'LogicalExpression'
	|| node.parent.operator !== node.operator;
