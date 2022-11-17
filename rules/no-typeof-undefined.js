'use strict';
const {matches} = require('./selectors/index.js');
const {
	addParenthesizesToReturnOrThrowExpression,
} = require('./fix/index.js');
const {removeSpacesAfter} = require('./fix/index.js');
const isOnSameLine = require('./utils/is-on-same-line.js');
const needsSemicolon = require('./utils/needs-semicolon.js');
const {
	isParenthesized,
} = require('./utils/parentheses.js');


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
			const [typeofToken, secondToken] = sourceCode.getFirstTokens(typeofNode, 2);

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

					const {parent} = binaryExpression;
					if (
						(parent.type === 'ReturnStatement' || parent.type === 'ThrowStatement')
						&& parent.argument === binaryExpression
						&& !isParenthesized(binaryExpression, sourceCode)
						&& !isParenthesized(typeofNode, sourceCode)
						&& !isOnSameLine(typeofToken, secondToken)
					) {
						yield * addParenthesizesToReturnOrThrowExpression(fixer, parent, sourceCode);
						return;
					}

					const tokenBefore = sourceCode.getTokenBefore(binaryExpression);
					if (needsSemicolon(tokenBefore, sourceCode, secondToken.value)) {
						yield fixer.insertTextBefore(binaryExpression, ';');
					}
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
