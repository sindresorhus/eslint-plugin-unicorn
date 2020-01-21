'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isValueUsed = require('./utils/is-value-used');

const getMethodName = memberExpression => memberExpression.property.name;

const create = context => {
	return {
		CallExpression(node) {
			const {callee} = node;

			if (callee.type === 'MemberExpression' && getMethodName(callee) === 'appendChild') {
				const fix = isValueUsed(node) ? undefined : fixer => fixer.replaceText(callee.property, 'append');

				context.report({
					node,
					message: 'Prefer `Node#append()` over `Node#appendChild()`.',
					fix
				});
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
