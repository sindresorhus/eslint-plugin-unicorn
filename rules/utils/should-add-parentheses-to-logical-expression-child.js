'use strict';

/**
Check if parentheses should be added to a `node` when it's used as child of `LogicalExpression`.
@param {Node} node - The AST node to check.
@param {{operator: string, property: string}} options - Options
@returns {boolean}
*/
function shouldAddParenthesesToLogicalExpressionChild(node, {operator, property}) {
	// This is not really needed, but more readable
	if (node.type === 'AwaitExpression') {
		return true;
	}

	// Lower precedence than `LogicalExpression`
	// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#Table
	if (
		node.type === 'ConditionalExpression' ||
		node.type === 'AssignmentExpression' ||
		node.type === 'AssignmentExpression' ||
		node.type === 'YieldExpression' ||
		node.type === 'SequenceExpression'
	) {
		return true;
	}

	/* istanbul ignore next: When operator or property is different, need more logic here, not implemented */
	if (operator !== '??' || property !== 'left') {
		throw new Error('Not supported.');
	}

	return false;
}

module.exports = shouldAddParenthesesToLogicalExpressionChild;
