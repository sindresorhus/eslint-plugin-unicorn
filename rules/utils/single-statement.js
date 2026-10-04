/**
Get the single statement of a statement position like a loop body or an `if` branch: the statement itself, or the only statement of a block (`{statement;}`).

Returns `undefined` for a block that does not have exactly one statement, or when `node` is missing.

@param {import('estree').Statement | undefined} node
@returns {import('estree').Statement | undefined}
*/
export function getSingleStatement(node) {
	if (node?.type !== 'BlockStatement') {
		return node;
	}

	if (node.body.length === 1) {
		return node.body[0];
	}
}

/**
Get the expression of the single statement of a statement position like a loop body or an `if` branch, when that statement is an expression statement (`foo();` or `{foo();}`).

@param {import('estree').Statement | undefined} node
@returns {import('estree').Expression | undefined}
*/
export function getOnlyExpression(node) {
	const statement = getSingleStatement(node);
	if (statement?.type === 'ExpressionStatement') {
		return statement.expression;
	}
}
