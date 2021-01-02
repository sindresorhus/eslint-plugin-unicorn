'use strict';
const {isParenthesized, getStaticValue} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_LENGTH = 'array-length';
const MESSAGE_ID_FIRST_ELEMENT = 'first-element';
const MESSAGE_ID_SPREAD = 'spread';
const messages = {
	[MESSAGE_ID_ERROR]: 'Do not use `new Array()`.',
	[MESSAGE_ID_LENGTH]: 'The argument is length of array.',
	[MESSAGE_ID_FIRST_ELEMENT]: 'The argument is first element of array.',
	[MESSAGE_ID_SPREAD]: 'Spread the argument.'
};
const newArraySelector = [
	'NewExpression',
	'[callee.type="Identifier"]',
	'[callee.name="Array"]',
	'[arguments.length<2]'
].join('');

function create(context) {
	const sourceCode = context.getSourceCode();

	const reportEmptyArray = node => {
		context.report({
			node,
			messageId: MESSAGE_ID_ERROR,
			fix: fixer => fixer.replaceText(node, '[]')
		});
	};

	const reportSpreadElementArray = node => {
		context.report({
			node,
			messageId: MESSAGE_ID_ERROR,
			suggest: [
				{
					messageId: MESSAGE_ID_SPREAD,
					fix: fixer => fixer.replaceText(node, `[${sourceCode.getText(node.arguments[0])}]`)
				}
			]
		});
	};

	const getParenthesizedText = node => {
		const text = sourceCode.getText(node);
		return isParenthesized(node, sourceCode) ? `(${text})` : text;
	};

	return {
		[newArraySelector](node) {
			// Empty array
			if (node.arguments.length === 0) {
				reportEmptyArray(node);
				return;
			}

			const [argumentNode] = node.arguments;
			// We are not sure how many `arguments` passed
			if (argumentNode.type === 'SpreadElement') {
				reportSpreadElementArray(node);
				return;
			}

			const result = getStaticValue(argumentNode, context.getScope());
			const text = getParenthesizedText(argumentNode);

			// `new Array(unknown)`
			if (result === null) {
				context.report({
					node,
					messageId: MESSAGE_ID_ERROR,
					suggest: [
						{
							messageId: MESSAGE_ID_LENGTH,
							fix: fixer => fixer.replaceText(node, `Array.from({length: ${text}})`)
						},
						{
							messageId: MESSAGE_ID_FIRST_ELEMENT,
							fix: fixer => fixer.replaceText(node, `[${text}]`)
						}
					]
				});
				return;
			}

			const {value} = result;

			// `new Array(number)`
			if (typeof value === 'number') {
				context.report({
					node,
					messageId: MESSAGE_ID_ERROR,
					fix: fixer => fixer.replaceText(node, `Array.from({length: ${text}}`)
				});
				return;
			}

			// `new Array(notANumber)`
			context.report({
				node,
				messageId: MESSAGE_ID_ERROR,
				fix: fixer => fixer.replaceText(node, `[${text}]`)
			});
		}
	};
}

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
