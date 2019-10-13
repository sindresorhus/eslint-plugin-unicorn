'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const methods = new Map([
	// Method, argument indexes
	['slice', [0, 1]],
	['splice', [0]]
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
			return String(node.value) === String(target.value);
		case 'MemberExpression':
			return isSame(node.object, target.object) && isSame(node.property, target.property);
		default:
			return false;
	}
};

const needFix = target => argument => {
	const {type, operator, left} = argument;

	if (
		type === 'BinaryExpression' &&
		operator === '-' &&
		left &&
		left.type === 'MemberExpression' &&
		left.property &&
		left.property.type === 'Identifier' &&
		left.property.name === 'length' &&
		left.object &&
		isSame(target, left.object)
	) {
		return true;
	}

	return false;
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
		const shouldFixArguments = argumentIndexes
			.map(index => argumentsNodes[index])
			.filter(Boolean)
			.filter(needFix(target));

		if (shouldFixArguments.length > 0) {
			context.report({
				node,
				message: `Prefer \`-n\` over \`.length - n\` for \`${methodName}\``,
				fix(fixer) {
					return shouldFixArguments.map(argument => fixer.remove(argument.left));
				}
			});
		}
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
