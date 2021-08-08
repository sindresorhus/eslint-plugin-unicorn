'use strict';

// Keep logic sync with `../selector/not-left-hand-side.js`
const isLeftHandSide = node =>
	(node.parent.type === 'AssignmentExpression' && node.parent.left === node)
	|| (node.parent.type === 'UpdateExpression' && node.parent.argument === node)
	|| (
		node.parent.type === 'UnaryExpression'
		&& node.parent.operator === 'delete'
		&& node.parent.argument === node
	);

module.exports = isLeftHandSide;
