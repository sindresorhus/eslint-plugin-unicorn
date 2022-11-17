'use strict';
const isShadowed = require('./utils/is-shadowed.js');
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
	const {
		checkGlobalVariables,
	} = {
		checkGlobalVariables: true,
		...context.options[0],
	};

	return {
		[selector](binaryExpression) {
			const {left: typeofNode, right: undefinedString} = binaryExpression;
			if (undefinedString.value !== 'undefined') {
				return;
			}

			const valueNode = typeofNode.argument;

			if (
				valueNode.type === 'Identifier'
				&& !checkGlobalVariables
				&& !isShadowed(context.getScope(), valueNode)
			) {
				return;
			}

			const sourceCode = context.getSourceCode();
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
						&& !isOnSameLine(typeofToken, secondToken)
						&& !isParenthesized(binaryExpression, sourceCode)
						&& !isParenthesized(typeofNode, sourceCode)
					) {
						yield * addParenthesizesToReturnOrThrowExpression(fixer, parent, sourceCode);
						return;
					}

					const tokenBefore = sourceCode.getTokenBefore(binaryExpression);
					if (needsSemicolon(tokenBefore, sourceCode, secondToken.value)) {
						yield fixer.insertTextBefore(binaryExpression, ';');
					}
				},
			};
		},
	};
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkGlobalVariables: {
				type: 'boolean',
				default: false,
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce compare with `undefined` directly.',
		},
		fixable: 'code',
		schema,
		messages,
	},
};
