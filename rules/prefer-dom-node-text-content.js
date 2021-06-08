'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url.js');
const {memberExpressionSelector} = require('./selectors/index.js');

const MESSAGE_ID = 'prefer-dom-node-text-content';
const messages = {
	[MESSAGE_ID]: 'Prefer `.textContent` over `.innerText`.'
};

const selector = memberExpressionSelector('innerText');

const create = context => {
	return {
		[selector]({property: node}) {
			context.report({
				node,
				messageId: MESSAGE_ID,
				fix: fixer => fixer.replaceText(node, 'textContent')
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.textContent` over `.innerText`.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema: [],
		messages
	}
};
