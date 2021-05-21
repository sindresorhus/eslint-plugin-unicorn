'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const {methodCallSelector} = require('./selectors');
const {isBooleanNode} = require('./utils/boolean');

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `.some(…)` over `.find(…)`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `.find(…)` with `.some(…)`.'
};

const arrayFindCallSelector = methodCallSelector({
	name: 'find',
	min: 1,
	max: 2
});

const create = context => {
	return {
		[arrayFindCallSelector](node) {
			if (isBooleanNode(node)) {
				node = node.callee.property;
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
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.some(…)` over `.find(…)`.',
			url: getDocumentationUrl(__filename),
			suggestion: true
		},
		schema: [],
		messages
	}
};
