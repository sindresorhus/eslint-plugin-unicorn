'use strict';
const {isCommaToken} = require('eslint-utils');
const {
	matches,
	newExpressionSelector,
	methodCallSelector,
} = require('./selectors/index.js');
const {getParentheses} = require('./utils/parentheses.js');

const SPREAD_IN_LIST = 'spread-in-list';
const ITERABLE_TO_ARRAY = 'iterable-to-array';
const ITERABLE_TO_ARRAY_IN_FOR_OF = 'iterable-to-array-in-for-of';
const messages = {
	[SPREAD_IN_LIST]: 'Spread an {{argumentType}} literal in {{parentDescription}} is unnecessary.',
	[ITERABLE_TO_ARRAY]: '`{{parentDescription}}` accepts iterable as argument, it\'s unnecessary to convert to an array.',
	[ITERABLE_TO_ARRAY_IN_FOR_OF]: '`for…of` can iterate over iterable, it\'s unnecessary to convert to an array.',
};

const uselessSpreadInListSelector = matches([
	'ArrayExpression > SpreadElement.elements > ArrayExpression.argument',
	'ObjectExpression > SpreadElement.properties > ObjectExpression.argument',
	'CallExpression > SpreadElement.arguments > ArrayExpression.argument',
	'NewExpression > SpreadElement.arguments > ArrayExpression.argument',
]);

const iterableToArraySelector = [
	'ArrayExpression',
	'[elements.length=1]',
	'[elements.0.type="SpreadElement"]',
].join('');
const uselessIterableToArraySelector = matches([
	[
		matches([
			newExpressionSelector({names: ['Map', 'WeakMap', 'Set', 'WeakSet'], length: 1}),
			methodCallSelector({object: 'Promise', names: ['all', 'race', 'allSettled'], length: 1}),
			methodCallSelector({object: 'Array', name: 'from', length: 1}),
		]),
		' > ',
		`${iterableToArraySelector}.arguments:first-child`,
	].join(''),
	[
		'ForOfStatement',
		' > ',
		`${iterableToArraySelector}.right`,
	].join(''),
]);

const parentDescriptions = {
	ArrayExpression: 'array literal',
	ObjectExpression: 'object literal',
	CallExpression: 'arguments',
	NewExpression: 'arguments',
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
		[uselessSpreadInListSelector](spreadObject) {
			const spreadElement = spreadObject.parent;
			const spreadToken = sourceCode.getFirstToken(spreadElement);
			const parentType = spreadElement.parent.type;

			return {
				node: spreadToken,
				messageId: SPREAD_IN_LIST,
				data: {
					argumentType: spreadObject.type === 'ArrayExpression' ? 'array' : 'object',
					parentDescription: parentDescriptions[parentType],
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
						lastToken,
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
				},
			};
		},
		[uselessIterableToArraySelector](array) {
			const {parent} = array;
			let parentDescription = '';
			let messageId = ITERABLE_TO_ARRAY;
			switch (parent.type) {
				case 'ForOfStatement':
					messageId = ITERABLE_TO_ARRAY_IN_FOR_OF;
					break;
				case 'NewExpression':
					parentDescription = `new ${parent.callee.name}(…)`;
					break;
				case 'CallExpression':
					parentDescription = `${parent.callee.object.name}.${parent.callee.property.name}(…)`;
					break;
				// No default
			}

			return {
				node: array,
				messageId,
				data: {parentDescription},
				* fix(fixer) {
					const [
						openingBracketToken,
						spreadToken,
					] = sourceCode.getFirstTokens(array, 2);

					// `[...iterable]`
					//  ^
					yield fixer.remove(openingBracketToken);

					// `[...iterable]`
					//   ^^^
					yield fixer.remove(spreadToken);

					const [
						commaToken,
						closingBracketToken,
					] = sourceCode.getLastTokens(array, 2);

					// `[...iterable]`
					//              ^
					yield fixer.remove(closingBracketToken);

					// `[...iterable,]`
					//              ^
					if (isCommaToken(commaToken)) {
						yield fixer.remove(commaToken);
					}
				},
			};
		},
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary spread.',
		},
		fixable: 'code',
		messages,
	},
};
