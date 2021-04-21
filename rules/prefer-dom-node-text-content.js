'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'prefer-dom-node-text-content';
const messages = {
	[MESSAGE_ID]: 'Prefer `.textContent` over `.innerText`.'
};

const selector = [
	'MemberExpression',
	'[computed=false]',
	'>',
	'Identifier.property',
	'[name="innerText"]'
].join('');

const create = context => {
	return {
		[selector]: node => {
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
		messages,
		schema: []
	}
};
