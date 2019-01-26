'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const isRemoveChild = callee => {
	if (callee.type === 'MemberExpression') {
		const {property} = callee;

		if (property.type === 'Identifier') {
			return property.name === 'removeChild';
		}
	}

	return false;
};

const getCalleeName = callee => {
	const {object} = callee;

	if (object.type === 'Identifier') {
		return 'this';
	}

	if (object.type === 'MemberExpression') {
		const {object: identifier} = object;

		if (identifier.type === 'ThisExpression') {
			return 'this';
		}

		if (identifier.type === 'Identifier') {
			return identifier.name;
		}
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
			const {arguments: args} = node;

			if (isRemoveChild(callee)) {
				const calleeName = getCalleeName(callee);
				const argumentName = getArgumentName(args);

				if (calleeName === argumentName) {
					context.report({
						node,
						message: 'Prefer `remove` over `removeChild`',
						fix: fixer => fixer.replaceText(node, `${calleeName}.remove()`)
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
