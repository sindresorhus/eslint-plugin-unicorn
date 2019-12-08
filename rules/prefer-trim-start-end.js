'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const methods = new Map([
	['trimLeft', 'trimStart'],
	['trimRight', 'trimEnd']
]);

const messages = {};

for (const [method, replacement] of methods.entries()) {
	messages[method] = `Prefer \`String#${method}()\` over \`String#${replacement}()\`.`;
}

const create = context => {
	return {
		CallExpression(node) {
			const {callee, arguments: arguments_} = node;

			if (
				callee.type !== 'MemberExpression' ||
				callee.property.type !== 'Identifier' ||
				arguments_.length !== 0
			) {
				return;
			}

			const method = callee.property.name;

			if (!methods.has(method)) {
				return;
			}

			const replacement = methods.get(method);

			context.report({
				node,
				messageId: method,
				fix: fixer => fixer.replaceText(callee.property, replacement)
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
