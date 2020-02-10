'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isValueNotUsable = require('./utils/is-value-not-usable');
const methodSelector = require('./utils/method-selector');

const selector = methodSelector({
	name: 'removeChild',
	length: 1
});

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
		[selector](node) {
			const {callee} = node;

			const callerName = getCallerName(callee);

			if (
				(callerName === 'parentNode' || callerName === 'parentElement')
			) {
				const argumentName = getArgumentName(node.arguments);

				if (argumentName) {
					const fix = isValueNotUsable(node) ? fixer => fixer.replaceText(node, `${argumentName}.remove()`) : undefined;

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
