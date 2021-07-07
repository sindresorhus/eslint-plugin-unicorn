'use strict';
const {isCommaToken} = require('eslint-utils');
const {matches} = require('./selectors/index.js');
const {getParentheses} = require('./utils/parentheses.js');

const MESSAGE_ID = 'no-useless-spread';
const messages = {
	[MESSAGE_ID]: 'Spread an {{argumentType}} literal in {{parentDescription}} is unnecessary.'
};

const selector = matches([
	'ArrayExpression > SpreadElement.elements > ArrayExpression.argument',
	'ObjectExpression > SpreadElement.properties > ObjectExpression.argument',
	'CallExpression > SpreadElement.arguments > ArrayExpression.argument',
	'NewExpression > SpreadElement.arguments > ArrayExpression.argument'
]);

const parentDescriptions = {
	ArrayExpression: 'array literal',
	ObjectExpression: 'object literal',
	CallExpression: 'arguments',
	NewExpression: 'arguments'
};

function getCommaTokens(arrayExpression, sourceCode) {
	let startToken = sourceCode.getFirstToken(arrayExpression);

	return arrayExpression.elements.map((element, index, elements) => {
		if (index === elements.length - 1) {
			const penultimateToken = sourceCode.getLastToken(arrayExpression, {skip: 1});
			if (isCommaToken(penultimateToken)) {
				return penultimateToken;
			}

			return;
		}

		const commaToken = sourceCode.getTokenAfter(element || startToken, isCommaToken);
		startToken = commaToken;
		return commaToken;
	});
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[selector](spreadObject) {
			const spreadElement = spreadObject.parent;
			const spreadToken = sourceCode.getFirstToken(spreadElement);
			const parentType = spreadElement.parent.type;

			return {
				node: spreadToken,
				messageId: MESSAGE_ID,
				data: {
					argumentType: spreadObject.type === 'ArrayExpression' ? 'array' : 'object',
					parentDescription: parentDescriptions[parentType]
				},
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				* fix(fixer) {
					// `[...[foo]]`
					//   ^^^
					yield fixer.remove(spreadToken);

					// `[...(( [foo] ))]`
					//      ^^       ^^
					const parentheses = getParentheses(spreadObject, sourceCode);
					for (const parenthesis of parentheses) {
						yield fixer.remove(parenthesis);
					}

					// `[...[foo]]`
					//      ^
					const firstToken = sourceCode.getFirstToken(spreadObject);
					yield fixer.remove(firstToken);

					const [
						penultimateToken,
						lastToken
					] = sourceCode.getLastTokens(spreadObject, 2);

					// `[...[foo]]`
					//          ^
					yield fixer.remove(lastToken);

					// `[...[foo,]]`
					//          ^
					if (isCommaToken(penultimateToken)) {
						yield fixer.remove(penultimateToken);
					}

					if (parentType !== 'CallExpression' && parentType !== 'NewExpression') {
						return;
					}

					const commaTokens = getCommaTokens(spreadObject, sourceCode);
					for (const [index, commaToken] of commaTokens.entries()) {
						if (spreadObject.elements[index]) {
							continue;
						}

						// `call([foo, , bar])`
						//             ^ Replace holes with `undefined`
						yield fixer.insertTextBefore(commaToken, 'undefined');
					}
				}
			};
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary spread.'
		},
		fixable: 'code',
		messages
	}
};
