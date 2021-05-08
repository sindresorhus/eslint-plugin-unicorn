'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const getPropertyName = require('./utils/get-property-name');

const MESSAGE_ID = 'no-document-cookie';
const messages = {
	[MESSAGE_ID]: 'Do not use `document.cookie` directly.'
};

const selector = [
	'AssignmentExpression',
	'>',
	'MemberExpression.left',
	'[object.type="Identifier"]',
	'[object.name="document"]'
].join('');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		[selector](node) {
			if (getPropertyName(node, context.getScope()) !== 'cookie') {
				return;
			}

			context.report({
				node,
				messageId: MESSAGE_ID
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Do not use `document.cookie` directly.',
			url: getDocumentationUrl(__filename)
		},
		schema: [],
		messages
	}
};
