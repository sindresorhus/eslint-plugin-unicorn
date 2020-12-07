'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID_MISSING_MESSAGE = 'constructorMissingMessage';
const MESSAGE_ID_EMPTY_MESSAGE = 'emptyMessage';
const messages = {
	[MESSAGE_ID_MISSING_MESSAGE]: 'Pass a message to the error constructor.',
	[MESSAGE_ID_EMPTY_MESSAGE]: 'Error message should not be an empty string.'
};

const errorConstructors = [
	'Error',
	'EvalError',
	'InternalError',
	'RangeError',
	'ReferenceError',
	'SyntaxError',
	'TypeError',
	'URIError'
];

const selector = [
	':matches(NewExpression, CallExpression)',
	'[callee.type="Identifier"]',
	`:matches(${errorConstructors.map(name => `[callee.name="${name}"]`).join(', ')})`
].join('');

const isEmptyMessageString = node => {
	return (
		node.type === 'Literal' &&
		!node.value
	);
};

const create = context => {
	const throwStatements = [];
	return {
		[selector](node) {
			if (node.arguments.length === 0) {
				context.report({
					node,
					messageId: MESSAGE_ID_MISSING_MESSAGE
				});
				return;
			}

			const [message] = node.arguments;
			if (isEmptyMessageString(message)) {
				context.report({
					node: message,
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
			url: getDocumentationUrl(__filename)
		},
		messages
	}
};
