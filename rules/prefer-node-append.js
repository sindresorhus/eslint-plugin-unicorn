'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isValueNotUsable = require('./utils/is-value-not-usable');
const methodSelector = require('./utils/method-selector');

const selector = methodSelector({
	name: 'appendChild',
	length: 1
});

const create = context => {
	return {
		[selector](node) {
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
