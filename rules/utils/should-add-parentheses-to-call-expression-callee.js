'use strict';

/*
This function is used in `prefer-await` rule, we only added few known node types that not need add parentheses.
Should be improved in future.
*/

const nodeTypesDoNotNeedParentheses = new Set([
	'Identifier',
	'MemberExpression',
]);

/**
Check if parentheses should be added to a `node` when it's used as `callee` of `CallExpression`.

@param {Node} node - The AST node to check.
@returns {boolean}
*/
const shouldAddParenthesesToCallExpressionCallee = node =>
	!nodeTypesDoNotNeedParentheses.has(node.type);

module.exports = shouldAddParenthesesToCallExpressionCallee;
