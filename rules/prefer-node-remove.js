'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const {notDomNode} = require('./utils/not-dom-node');
const needsSemicolon = require('./utils/needs-semicolon');

const selector = methodSelector({
	name: 'removeChild',
	length: 1
});

const ERROR_MESSAGE_ID = 'error';
const SUGGESTION_MESSAGE_ID = 'suggestion';

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[selector](node) {
			const parentNode = node.callee.object;
			const childNode = node.arguments[0];

			if (notDomNode(parentNode) || notDomNode(childNode)) {
				return;
			}

			context.report({
				node,
				messageId: ERROR_MESSAGE_ID,
				suggest: [
					{
						messageId: SUGGESTION_MESSAGE_ID,
						fix: fixer => {
							let childNodeText = sourceCode.getText(childNode);
							if (isParenthesized(childNode, sourceCode) || childNode.type === 'AwaitExpression') {
								childNodeText = `(${childNodeText})`;
							}

							if (needsSemicolon(sourceCode.getTokenBefore(node), sourceCode, childNodeText)) {
								childNodeText = `;${childNodeText}`;
							}

							return fixer.replaceText(node, `${childNodeText}.remove()`);
						}
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
		fixable: 'code',
		messages: {
			[ERROR_MESSAGE_ID]: 'Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`.',
			[SUGGESTION_MESSAGE_ID]: 'Replace `parentNode.removeChild(childNode)` with `childNode.remove()`.'
		}
	}
};
