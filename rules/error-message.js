'use strict';
const {getStaticValue} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url.js');
const {callOrNewExpressionSelector} = require('./selectors/index.js');

const MESSAGE_ID_MISSING_MESSAGE = 'missing-message';
const MESSAGE_ID_EMPTY_MESSAGE = 'message-is-empty';
const MESSAGE_ID_NOT_STRING = 'message-is-not-a-string';
const messages = {
	[MESSAGE_ID_MISSING_MESSAGE]: 'Pass a message to the `{{constructor}}` constructor.',
	[MESSAGE_ID_EMPTY_MESSAGE]: 'Error message should not be an empty string.',
	[MESSAGE_ID_NOT_STRING]: 'Error message should be a string.'
};

const selector = callOrNewExpressionSelector({
	names: [
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
		'Error',
		'EvalError',
		'RangeError',
		'ReferenceError',
		'SyntaxError',
		'TypeError',
		'URIError',
		'InternalError'
	]
});

const create = context => {
	return {
		[selector](expression) {
			const callArguments = expression.arguments;
			if (!callArguments.length) {
				context.report({
					node: expression,
					messageId: MESSAGE_ID_MISSING_MESSAGE,
					data: {
						constructor: expression.callee.name
					}
				});
				return;
			}

			const [node] = expression.arguments;

			// These types can't be string, and `getStaticValue` may don't know the value
			// Add more types, if issue reported
			if (node.type === 'ArrayExpression' || node.type === 'ObjectExpression') {
				context.report({
					node,
					messageId: MESSAGE_ID_NOT_STRING
				});
				return;
			}

			const result = getStaticValue(node, context.getScope());

			// We don't know the value of `message`
			if (!result) {
				return;
			}

			const {value} = result;
			if (typeof value !== 'string') {
				context.report({
					node,
					messageId: MESSAGE_ID_NOT_STRING
				});
				return;
			}

			if (value === '') {
				context.report({
					node,
					messageId: MESSAGE_ID_EMPTY_MESSAGE
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce passing a `message` value when creating a built-in error.',
			url: getDocumentationUrl(__filename)
		},
		schema: [],
		messages
	}
};
