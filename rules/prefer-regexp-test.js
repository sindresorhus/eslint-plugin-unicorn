'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'prefer-regexp-test';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{value}}`.'
};

const create = context => {
	return {
		Literal(node) {
			if (node.value !== 'unicorn') {
				return;
			}

			context.report({
				node,
				messageId: MESSAGE_ID,
				data: {
					value: 'unicorn',
					replacement: '🦄'
				},
				fix: fixer => fixer.replaceText(node, '\'🦄\'')
			});
		}
	}
};

const schema = [];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
