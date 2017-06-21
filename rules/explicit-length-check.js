'use strict';

const types = {
	eq: ['===', '=='],
	gt: ['>'],
	gte: ['>='],
	lt: ['<'],
	ne: ['!==', '!=']
};

function reportError(context, node, message) {
	if (typeof message === 'string') {
		context.report({
			node,
			message
		});
	}
}

function checkEmptyType(type, operator, value) {
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

function checkNotEmptyType(type, operator, value) {
	switch (type) {
		case 'gt':
			if ((types.gte.includes(operator) && value === 1) ||
				(types.ne.includes(operator) && value === 0)
			) {
				return 'not empty `length` should be compared with `> 0`';
			}
			break;
		case 'gte':
			if ((types.gt.includes(operator) && value === 0) ||
				(types.ne.includes(operator) && value === 0)
			) {
				return 'not empty `length` should be compared with `>= 1`';
			}
			break;
		case 'ne':
			if ((types.gt.includes(operator) && value === 0) ||
				(types.gte.includes(operator) && value === 1)
			) {
				return 'not empty `length` should be compared with `!== 1`';
			}
			break;
		default:
			break;
	}
}

function checkBinaryExpression(context, node, options = {}) {
	if (node.left.type === 'Literal' &&
		node.right.type === 'MemberExpression' &&
		node.right.property.type === 'Identifier' &&
		node.right.property.name === 'length'
	) {
		reportError(context, node, '`length` property should be first argument of comparision');
		return;
	}

	if (node.right.type === 'Literal' &&
		node.left.type === 'MemberExpression' &&
		node.left.property.type === 'Identifier' &&
		node.left.property.name === 'length'
	) {
		reportError(context,
			node,
			checkEmptyType(options.empty, node.operator, node.right.value)
		);
		reportError(context,
			node,
			checkNotEmptyType(options['not-empty'], node.operator, node.right.value)
		);
	}
}

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

	if (node.type === 'BinaryExpression') {
		checkBinaryExpression(context, node, context.options[0]);
		return;
	}

	if (node.type === 'MemberExpression' &&
		node.property.type === 'Identifier' &&
		node.property.name === 'length'
	) {
		reportError(context, node, '`length` property should be compared to a value.');
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
