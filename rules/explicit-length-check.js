'use strict';

const types = {
	eq: ['===', '=='],
	lt: ['<']
};

function checkComparisionType(type, operator, value) {
	switch (type) {
		case 'eq':
			if (types.lt.includes(operator) && value === 1) {
				return 'empty `length` should be compared with `=== 0`';
			}
			break;
		case 'lt':
			if (types.eq.includes(operator) && value === 0) {
				return 'empty `length` should be compared with `< 1`';
			}
			break;
		default:
			break;
	}
}

function checkBinaryExpression(context, node, empty) {
	let arrayNode;
	let valueNode;

	if (node.left.type === 'Literal' && node.right.type === 'MemberExpression') {
		context.report({
			node,
			message: '`length` property should be first argument of comparision'
		});
		return;
	}

	if (node.left.type === 'MemberExpression' && node.right.type === 'Literal') {
		arrayNode = node.left;
		valueNode = node.right;
	}

	if (arrayNode &&
		valueNode &&
		arrayNode.property.type === 'Identifier' &&
		arrayNode.property.name === 'length'
	) {
		const compTypeRes = checkComparisionType(empty, node.operator, valueNode.value);
		if (typeof compTypeRes === 'string') {
			context.report({
				node,
				message: compTypeRes
			});
		}
	}
}

function checkExpression(context, node) {
	const {empty} = context.options[0] || {};

	if (node.type === 'LogicalExpression') {
		checkExpression(context, node.left);
		checkExpression(context, node.right);
		return;
	}

	if (node.type === 'UnaryExpression' && node.operator === '!') {
		checkExpression(context, node.argument);
		return;
	}

	if (node.type === 'BinaryExpression') {
		checkBinaryExpression(context, node, empty);
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
