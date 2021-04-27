'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodCallSelector = require('./selectors/method-call-selector');

const MESSAGE_ID = 'no-invalid-remove-event-listener';
const messages = {
	[MESSAGE_ID]:
		'The listener argument should be a function reference.'
};

const isBindCall = node =>
	node.type === 'CallExpression' &&
	node.callee.type === 'MemberExpression' &&
	node.callee.property.name === 'bind' &&
	!node.callee.computed;

const removeEventListenerSelector = methodCallSelector({
	name: 'removeEventListener',
	min: 2
});

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		[removeEventListenerSelector]: node => {
			const secondArgument = node.arguments[1];
			if (!secondArgument) {
				return;
			}

			if (
				isBindCall(secondArgument) ||
				secondArgument.type === 'FunctionExpression' ||
				secondArgument.type === 'ArrowFunctionExpression'
			) {
				context.report({
					node: secondArgument,
					messageId: MESSAGE_ID
				});
			}
		}
	};
};

const schema = [];

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description:
				'Prevent calling `EventTarget#removeEventListener()` with the result of an expression',
			url: getDocumentationUrl(__filename)
		},
		schema,
		messages
	}
};
