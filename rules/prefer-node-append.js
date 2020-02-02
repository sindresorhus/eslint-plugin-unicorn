'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isValueNotUsable = require('./utils/is-value-not-usable');

const create = context => {
	return {
		'CallExpression[callee.property.name="appendChild"]'(node) {
			const {callee} = node;

			if (node.arguments.length !== 1) {
				return;
			}

			if (callee.type === 'MemberExpression') {
				const fix = isValueNotUsable(node) ? fixer => fixer.replaceText(callee.property, 'append') : undefined;

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
