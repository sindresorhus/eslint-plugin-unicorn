'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const methods = new Map([
	['trimLeft', 'trimStart'],
	['trimRight', 'trimEnd']
]);

const selector = [
	methodSelector({
		names: ['trimLeft', 'trimRight'],
		length: 0
	}),
	'> MemberExpression.callee',
	'> Identifier.property'
].join(' ');

const messages = {};
for (const [method, replacement] of methods.entries()) {
	messages[method] = `Prefer \`String#${replacement}()\` over \`String#${method}()\`.`;
}

const create = context => {
	return {
		[selector](node) {
			const method = node.name;
			context.report({
				node,
				messageId: method,
				fix: fixer => fixer.replaceText(node, methods.get(method))
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String#trimStart()` / `String#trimEnd()` over `String#trimLeft()` / `String#trimRight()`.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages,
		schema: []
	}
};
