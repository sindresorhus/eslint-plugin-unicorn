'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'no-nested-ternary';
const messages = {
	[MESSAGE_ID]: 'Do not nest ternary expressions.'
};

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		ConditionalExpression: node => {
			const nodesToCheck = [node.alternate, node.consequent];

			for (const childNode of nodesToCheck) {
				if (childNode.type !== 'ConditionalExpression') {
					continue;
				}

				// Nesting more than one level not allowed.
				if (
					childNode.alternate.type === 'ConditionalExpression' ||
					childNode.consequent.type === 'ConditionalExpression'
				) {
					// TODO: Improve report location
					context.report({node, messageId: MESSAGE_ID});
					break;
				} else if (!isParenthesized(childNode, sourceCode)) {
					context.report({
						node: childNode,
						messageId: MESSAGE_ID,
						fix: fixer => [
							fixer.insertTextBefore(childNode, '('),
							fixer.insertTextAfter(childNode, ')')
						]
					});
				}
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
