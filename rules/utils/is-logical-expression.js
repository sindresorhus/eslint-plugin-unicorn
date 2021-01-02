'use strict';

/**
Check if the given node is a true logical expression or not.

The three binary expressions logical-or (`||`), logical-and (`&&`), and coalesce (`??`) are known as `ShortCircuitExpression`.
But ESTree represents those by `LogicalExpression` node.

This function rejects coalesce expressions of `LogicalExpression` node.
@param {Node} node - The node to check.
@returns {boolean} `true` if the node is `&&` or `||`.
@see https://tc39.es/ecma262/#prod-ShortCircuitExpression
*/
const isLogicalExpression = node =>
	node &&
	node.type === 'LogicalExpression' &&
	node.operator === '&&' || node.operator === '||';

module.exports = isLogicalExpression;
