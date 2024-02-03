'use strict';

/**
Check if parentheses should be added to a `node` when it's used as `argument` of `SpreadElement`.

@param {Node} node - The AST node to check.
@returns {boolean}
*/
const shouldAddParenthesesToSpreadElementArgument = node =>
	// The only node type need to add parentheses
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#table
	node.type === 'SequenceExpression';

module.exports = shouldAddParenthesesToSpreadElementArgument;
