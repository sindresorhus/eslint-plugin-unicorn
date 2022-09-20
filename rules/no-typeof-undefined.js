'use strict';
const {matches} = require('./selectors/index.js');
const {} = require('./fix/index.js');
const {removeSpacesAfter} = require('./fix/index.js');


const MESSAGE_ID_ERROR = 'no-typeof-undefined';
const messages = {
	[MESSAGE_ID_ERROR]: 'Compare with `undefined` directly instead of `typeof` check.',
};

const selector = [
	'BinaryExpression',
	matches(['===', '!==', '==', '!='].map(operator => `[operator="${operator}"]`)),
	'[left.type="UnaryExpression"]',
	'[left.operator="typeof"]',
	'[left.prefix]',
	'[right.type="Literal"]',
].join('');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		[selector](binaryExpression) {
			const {left: typeofNode, right: undefinedString} = binaryExpression;
			if (undefinedString.value !== "undefined") {
				return;
			}

			const sourceCode = context.getSourceCode();
			const valueNode = typeofNode.argument;
			const typeofToken = sourceCode.getFirstToken(typeofNode);

			return {
				node: binaryExpression,
				loc: typeofToken.loc,
				messageId: MESSAGE_ID_ERROR,
				* fix(fixer) {
					// Change `==`/`!=` to `===`/`!==`
					const {operator} = binaryExpression;
					if (operator === '==' || operator === '!=') {
						const operatorToken = sourceCode.getTokenAfter(
							typeofNode,
							token => token.type === 'Punctuator' && token.value === operator,
						);

						yield fixer.insertTextAfter(operatorToken, '=');
					}

					yield fixer.replaceText(undefinedString, 'undefined');

					yield fixer.remove(typeofToken);
					yield removeSpacesAfter(typeofToken, sourceCode, fixer);

					// TODO: return or throw, ASI,
				}
			}
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce compare with `undefined` directly.',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};
