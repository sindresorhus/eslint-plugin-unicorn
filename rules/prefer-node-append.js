'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isValueNotUsable = require('./utils/is-value-not-usable');

const create = context => {
	return {
		'CallExpression[callee.property.name="appendChild"][arguments.length=1]'(node) {
			// TODO: exclude those cases parent/child impossible to be `Node`
			const fix = isValueNotUsable(node) ?
				fixer => fixer.replaceText(node.callee.property, 'append') :
				undefined;

			context.report({
				node,
				message: 'Prefer `Node#append()` over `Node#appendChild()`.',
				fix
			});
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
