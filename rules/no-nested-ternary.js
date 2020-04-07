'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		ConditionalExpression: node => {
			const nodesToCheck = [node.alternate, node.consequent];

			for (const childNode of nodesToCheck) {
				if (childNode.type !== 'ConditionalExpression') {
					continue;
				}

				const message = 'Do not nest ternary expressions.';

				// Nesting more than one level not allowed.
				if (
					childNode.alternate.type === 'ConditionalExpression' ||
					childNode.consequent.type === 'ConditionalExpression'
				) {
					context.report({node, message});
					break;
				} else if (!isParenthesized(childNode, sourceCode)) {
					context.report({
						node: childNode,
						message,
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
		fixable: 'code'
	}
};
