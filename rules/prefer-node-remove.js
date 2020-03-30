'use strict';
const {isParenthesized, hasSideEffect} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const {notDomNodeSelector} = require('./utils/not-dom-node');
const needsSemicolon = require('./utils/needs-semicolon');
const isValueNotUsable = require('./utils/is-value-not-usable');

const selector = [
	methodSelector({
		name: 'removeChild',
		length: 1
	}),
	notDomNodeSelector('callee.object'),
	notDomNodeSelector('arguments.0')
].join('');

const ERROR_MESSAGE_ID = 'error';
const SUGGESTION_MESSAGE_ID = 'suggestion';

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[selector](node) {
			const parentNode = node.callee.object;
			const childNode = node.arguments[0];

			const problem = {
				node,
				messageId: ERROR_MESSAGE_ID
			};

			const fix = fixer => {
				let childNodeText = sourceCode.getText(childNode);
				if (isParenthesized(childNode, sourceCode) || childNode.type === 'AwaitExpression') {
					childNodeText = `(${childNodeText})`;
				}

				if (needsSemicolon(sourceCode.getTokenBefore(node), sourceCode, childNodeText)) {
					childNodeText = `;${childNodeText}`;
				}

				return fixer.replaceText(node, `${childNodeText}.remove()`);
			};

			if (!hasSideEffect(parentNode, sourceCode) && isValueNotUsable(node)) {
				problem.fix = fix;
			} else {
				problem.suggest = [
					{
						messageId: SUGGESTION_MESSAGE_ID,
						fix
					}
				];
			}

			context.report(problem);
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
