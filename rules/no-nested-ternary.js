'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID_TOO_DEEP = 'too-deep';
const MESSAGE_ID_SHOULD_PARENTHESIZED = 'should-parenthesized';
const messages = {
	[MESSAGE_ID_TOO_DEEP]: 'Do not nest ternary expressions.',
	[MESSAGE_ID_SHOULD_PARENTHESIZED]: 'Nest ternary expression should be parenthesized.'
};

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		'ConditionalExpression > ConditionalExpression > ConditionalExpression': node => {
			// Nesting more than one level not allowed.
			context.report({node, messageId: MESSAGE_ID_TOO_DEEP});
		},
		'ConditionalExpression > ConditionalExpression': node => {
			if (!isParenthesized(node, sourceCode)) {
				context.report({
					node,
					messageId: MESSAGE_ID_SHOULD_PARENTHESIZED,
					fix: fixer => [
						fixer.insertTextBefore(node, '('),
						fixer.insertTextAfter(node, ')')
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
			url: getDocumentationUrl(__filename)
		},
		messages,
		fixable: 'code'
	}
};
