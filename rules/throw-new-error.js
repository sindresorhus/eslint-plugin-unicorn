'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const messageId = 'throw-new-error';
const messages = {
	[messageId]: 'Use `new` when throwing an error.'
};

const customError = /^(?:[A-Z][\da-z]*)*Error$/;

const selector = [
	'ThrowStatement',
	'>',
	'CallExpression.argument',
	`:matches(${
		[
			// `throw FooError()`
			[
				'[callee.type="Identifier"]',
				`[callee.name=/${customError.source}/]`
			],
			// `throw lib.FooError()`
			[
				'[callee.type="MemberExpression"]',
				'[callee.computed=false]',
				'[callee.property.type="Identifier"]',
				`[callee.property.name=/${customError.source}/]`
			]
		].map(selector => selector.join('')).join(', ')
	})`
].join('');

const create = context => ({
	[selector]: node => {
		context.report({
			node,
			messageId,
			fix: fixer => fixer.insertTextBefore(node, 'new ')
		});
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages,
		fixable: 'code'
	}
};
