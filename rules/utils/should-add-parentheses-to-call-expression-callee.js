'use strict';

/*
This function is used in the `prefer-await` rule.

We only added a few known node types that do not need parentheses added. Should be expanded in the future.
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
