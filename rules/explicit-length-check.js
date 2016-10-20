'use strict';

function checkExpression(context, node) {
	if (node.type === 'LogicalExpression') {
		checkExpression(context, node.left);
		checkExpression(context, node.right);
		return;
	}

	if (node.type === 'UnaryExpression' && node.operator === '!') {
		checkExpression(context, node.argument);
		return;
	}

	if (node.type === 'MemberExpression' &&
		node.property.type === 'Identifier' &&
		node.property.name === 'length'
	) {
		context.report({
			node,
			message: '`length` property should be compared to a value.'
		});
	}
}

const create = context => {
	return {
		IfStatement: node => {
			checkExpression(context, node.test);
		}
	};
};

module.exports = {
	create,
	meta: {}
};
