'use strict';

/**
Check if parentheses should be added to a `node` when it's used as child of `LogicalExpression`.
@param {Node} node - The AST node to check.
@param {{operator: string, property: string}} options - Options
@returns {boolean}
*/
function shouldAddParenthesesToLogicalExpressionChild(node, {operator, property}) {
	// When operator or property is different, need check `LogicalExpression` operator precedence, not implemented
	/* c8 ignore next 3 */
	if (operator !== '??' || property !== 'left') {
		throw new Error('Not supported.');
	}

	// Not really needed, but more readable
	if (
		node.type === 'AwaitExpression'
		|| node.type === 'BinaryExpression'
	) {
		return true;
	}

	// Lower precedence than `LogicalExpression`
	// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#Table
	if (
		node.type === 'ConditionalExpression'
		|| node.type === 'AssignmentExpression'
		|| node.type === 'AssignmentExpression'
		|| node.type === 'YieldExpression'
		|| node.type === 'SequenceExpression'
	) {
		return true;
	}

	return false;
}

module.exports = shouldAddParenthesesToLogicalExpressionChild;
