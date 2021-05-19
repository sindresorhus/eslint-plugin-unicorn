'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const {methodCallSelector} = require('./selectors');

const MESSAGE_ID = 'prefer-string-trim-start-end';
const messages = {
	[MESSAGE_ID]: 'Prefer `String#{{replacement}}()` over `String#{{method}}()`.'
};

const selector = [
	methodCallSelector({
		names: ['trimLeft', 'trimRight'],
		length: 0
	}),
	' > .callee',
	' > .property'
].join(' ');

const create = context => {
	return {
		[selector](node) {
			const method = node.name;
			const replacement = method === 'trimLeft' ? 'trimStart' : 'trimEnd';

			context.report({
				node,
				messageId: MESSAGE_ID,
				data: {method, replacement},
				fix: fixer => fixer.replaceText(node, replacement)
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
		schema: [],
		messages
	}
};
