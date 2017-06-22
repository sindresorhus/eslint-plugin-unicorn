'use strict';

const operatorTypes = {
	gt: ['>'],
	gte: ['>='],
	ne: ['!==', '!=']
};

const getFixDetails = (node, operator, value) => {
	return {
		node,
		operator,
		value
	};
};

function reportError(context, node, message, fixDetails) {
	context.report({
		node,
		message,
		fix: fixDetails && (fixer => {
			return fixer.replaceText(node,
				`${context.getSourceCode().getText(fixDetails.node)} ${fixDetails.operator} ${fixDetails.value}`
			);
		})
	});
}

function checkEmptyType(context, node) {
	if (node.operator === '<' && node.right.value === 1) {
		reportError(context,
			node,
			'Empty `.length` should be compared with `=== 0`.',
			getFixDetails(node.left, '===', 0)
		);
	}
}

function checkNotEmptyType(context, node, type) {
	const value = node.right.value;
	const operator = node.operator;

	switch (type) {
		case 'gt':
			if ((operatorTypes.gte.indexOf(operator) !== -1 && value === 1) ||
				(operatorTypes.ne.indexOf(operator) !== -1 && value === 0)
			) {
				reportError(context,
					node,
					'Non-zero `.length` should be compared with `> 0`.',
					getFixDetails(node.left, '>', 0)
				);
			}
			break;
		case 'gte':
			if ((operatorTypes.gt.indexOf(operator) !== -1 && value === 0) ||
				(operatorTypes.ne.indexOf(operator) !== -1 && value === 0)
			) {
				reportError(context,
					node,
					'Non-zero `.length` should be compared with `>= 1`.',
					getFixDetails(node.left, '>=', 1)
				);
			}
			break;
		case 'ne':
			if ((operatorTypes.gt.indexOf(operator) !== -1 && value === 0) ||
				(operatorTypes.gte.indexOf(operator) !== -1 && value === 1)
			) {
				reportError(context,
					node,
					'Non-zero `.length` should be compared with `!== 0`.',
					getFixDetails(node.left, '!==', 0)
				);
			}
			break;
		default:
			break;
	}
}

function checkBinaryExpression(context, node, options) {
	if (node.right.type === 'Literal' &&
		node.left.type === 'MemberExpression' &&
		node.left.property.type === 'Identifier' &&
		node.left.property.name === 'length'
	) {
		checkEmptyType(context, node);
		checkNotEmptyType(context, node, options['not-empty']);
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
		checkBinaryExpression(context, node, context.options[0] || {});
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
	meta: {
		fixable: 'code'
	}
};
