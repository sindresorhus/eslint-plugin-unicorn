'use strict';

function isExpressionStatement(node) {
	return node.type === 'ExpressionStatement'
		|| (
			node.type === 'ChainExpression'
			&& node.parent.type === 'ExpressionStatement'
		);
}

module.exports = isExpressionStatement;
