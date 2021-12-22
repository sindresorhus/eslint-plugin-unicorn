'use strict';

function flatLogicalExpression(node, compareOperators = true) {
	return [node.left, node.right].flatMap(child =>
		child.type === 'LogicalExpression' && (compareOperators ? child.operator === node.operator : true)
			? flatLogicalExpression(child, compareOperators)
			: [child],
	);
}

module.exports = flatLogicalExpression;
