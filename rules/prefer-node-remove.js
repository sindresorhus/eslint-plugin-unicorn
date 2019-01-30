'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const getCallerName = callee => {
	const {object} = callee;

	if (object.type === 'Identifier') {
		return object.name;
	}

	if (object.type === 'MemberExpression') {
		const {property} = object;

		if (property.type === 'Identifier') {
			return property.name;
		}
	}

	return null;
};

const getMethodName = callee => {
	const {property} = callee;

	if (property.type === 'Identifier') {
		return property.name;
	}

	return null;
};

const getArgumentName = args => {
	const [identifier] = args;

	if (identifier.type === 'ThisExpression') {
		return 'this';
	}

	if (identifier.type === 'Identifier') {
		return identifier.name;
	}

	return null;
};

const create = context => {
	return {
		CallExpression(node) {
			const {callee} = node;

			if (callee.type !== 'MemberExpression') {
				return;
			}

			if (getCallerName(callee) === 'parentNode' &&
				getMethodName(callee) === 'removeChild'
			) {
				const argumentName = getArgumentName(node.arguments);

				if (argumentName) {
					context.report({
						node,
						message: 'Prefer `remove` over `parentNode.removeChild`',
						fix: fixer => fixer.replaceText(node, `${argumentName}.remove()`)
					});
				}
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
