'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isValueUsed = require('./utils/is-value-used');

const getMethodName = callee => {
	const {property} = callee;

	if (property.type === 'Identifier') {
		return property.name;
	}

	return null;
};

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

const getArgumentName = arguments_ => {
	const [identifier] = arguments_;

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

			if (node.arguments.length === 0 ||
				callee.type !== 'MemberExpression' ||
				callee.computed
			) {
				return;
			}

			const methodName = getMethodName(callee);
			const callerName = getCallerName(callee);

			if (methodName === 'removeChild' && (
				callerName === 'parentNode' ||
				callerName === 'parentElement'
			)) {
				const argumentName = getArgumentName(node.arguments);

				if (argumentName) {
					const fix = isValueUsed(node) ? undefined : fixer => fixer.replaceText(node, `${argumentName}.remove()`);

					context.report({
						node,
						message: `Prefer \`${argumentName}.remove()\` over \`${callerName}.removeChild(${argumentName})\`.`,
						fix
					});
				}
			}
		}
	};
};

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
