'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const methods = new Map([
	['trimLeft', 'trimStart'],
	['trimRight', 'trimEnd']
]);

const selector = methodSelector({
	names: ['trimLeft', 'trimRight'],
	length: 0
});

const messages = {};
for (const [method, replacement] of methods.entries()) {
	messages[method] = `Prefer \`String#${method}()\` over \`String#${replacement}()\`.`;
}

const create = context => {
	return {
		[selector](node) {
			const {property} = node.callee;
			const method = property.name;
			context.report({
				node,
				messageId: method,
				fix: fixer => fixer.replaceText(property, methods.get(method))
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
		fixable: 'code',
		messages
	}
};
