'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const methods = new Map([
	// Method, argument indexes
	['slice', [0, 1]],
	['splice', [0]]
]);

const fixableOperators = new Set([
	'-',
	// not right, disable for now
	// '+'
]);

const isSame = (target, node) => {
	if (target === node) {
		return true;
	}

	const {type} = target;

	if (node.type !== type) {
		return false;
	}

	switch (type) {
		case 'Identifier':
			return node.name === target.name && node.computed === target.computed;
		case 'Literal':
			return node.value === target.value;
		case 'TemplateLiteral':
			return (node.quasis.length === target.quasis.length) &&
				node.quasis.every((templateElement, index) => isSame(templateElement, target.quasis[index]));
		case 'TemplateElement':
			return node.value &&
				target.value &&
				(node.tail === target.tail) &&
				(node.value.raw === target.value.raw);
		case 'MemberExpression':
			return isSame(node.object, target.object) && isSame(node.property, target.property);
		default:
			return false;
	}
};

const isLengthMemberExpression = node => node &&
	node.type === 'MemberExpression' &&
	node.property &&
	node.property.type === 'Identifier' &&
	node.property.name === 'length' &&
	node.object;

const getLengthMemberExpression = node => {
	if (!node) {
		return;
	}

	const {type, operator, left} = node;

	if (!left) {
		return;
	}

	// Is `.length -`
	if (
		type === 'BinaryExpression' &&
		operator === '-' &&
		isLengthMemberExpression(left)
	) {
		return left;
	}

	// Nested BinaryExpression
	if (
		left.type === 'BinaryExpression' &&
		fixableOperators.has(operator)
	) {
		return getLengthMemberExpression(left);
	}
};

const getRemoveAbleNode = (target, argument) => {
	const lengthMemberExpression = getLengthMemberExpression(argument);

	if (lengthMemberExpression && isSame(target, lengthMemberExpression.object)) {
		return lengthMemberExpression;
	}
};

const create = context => ({
	CallExpression: node => {
		const {callee, arguments: argumentsNodes} = node;

		if (callee.type !== 'MemberExpression') {
			return;
		}

		const methodName = callee.property.name;

		if (!methods.has(methodName)) {
			return;
		}

		const target = callee.object;
		const argumentIndexes = methods.get(methodName);
		const removeAbleNodes = argumentIndexes
			.map(index => getRemoveAbleNode(target, argumentsNodes[index]))
			.filter(Boolean);

		if (removeAbleNodes.length === 0) {
			return;
		}

		context.report({
			node,
			message: `Prefer \`-n\` over \`.length - n\` for \`${methodName}\``,
			fix(fixer) {
				return removeAbleNodes.map(node => fixer.remove(node));
			}
		});
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
