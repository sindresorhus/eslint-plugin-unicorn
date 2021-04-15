'use strict';
const {getStaticValue} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID_MISSING_MESSAGE = 'constructorMissingMessage';
const MESSAGE_ID_EMPTY_MESSAGE = 'emptyMessage';
const MESSAGE_ID_NOT_STRING = 'message-is-not-a-string';
const messages = {
	[MESSAGE_ID_MISSING_MESSAGE]: 'Pass a message to the `{{constructor}}` constructor.',
	[MESSAGE_ID_EMPTY_MESSAGE]: 'Error message should not be an empty string.',
	[MESSAGE_ID_NOT_STRING]: 'Error message should be a string.'
};

const errorConstructors = [
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
	'Error',
	'EvalError',
	'RangeError',
	'ReferenceError',
	'SyntaxError',
	'TypeError',
	'URIError',
	'InternalError'
];

const selector = [
	':matches(NewExpression, CallExpression)',
	'[callee.type="Identifier"]',
	`:matches(${errorConstructors.map(name => `[callee.name="${name}"]`).join(', ')})`
].join('');
const noArgumentsExpressionSelector = `${selector}[arguments.length=0]`;
const errorMessageSelector = `${selector}[arguments.length>0]`;

const create = context => {
	return {
		[noArgumentsExpressionSelector](node) {
			context.report({
				node,
				messageId: MESSAGE_ID_MISSING_MESSAGE,
				data: {
					constructor: node.callee.name
				}
			});
		},
		[errorMessageSelector](expression) {
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
		messages,
		schema: []
	}
};
