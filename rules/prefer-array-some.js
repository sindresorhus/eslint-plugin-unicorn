'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `.some(…)` over `.find(…)`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `.find(…)` with `.some(…)`.'
};

const selector = [
	':matches(IfStatement, ConditionalExpression, ForStatement, WhileStatement, DoWhileStatement)',
	'>',
	methodSelector({
		name: 'find',
		min: 1,
		max: 2
	}),
	'.test',
	'>',
	'.callee',
	'>',
	'.property'
].join('');

const create = context => {
	return {
		[selector](node) {
			context.report({
				node,
				messageId: MESSAGE_ID_ERROR,
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						fix: fixer => fixer.replaceText(node, 'some')
					}
				]
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
		messages
	}
};
