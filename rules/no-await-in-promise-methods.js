'use strict';
const isPromiseMethodWithArray = require('./utils/is-promise-method-with-array.js');

const MESSAGE_ID_ERROR = 'no-await-in-promise-methods/error';
const MESSAGE_ID_SUGGESTION = 'no-await-in-promise-methods/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Promise in `Promise.{{method}}()` should not be awaited.',
	[MESSAGE_ID_SUGGESTION]: 'Remove `await`.',
};
const METHODS = ['all', 'allSettled', 'any', 'race'];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	* CallExpression(node) {
		if (!isPromiseMethodWithArray(node, METHODS)) {
			return;
		}

		for (const element of node.arguments[0].elements) {
			if (element?.type !== 'AwaitExpression') {
				continue;
			}

			yield {
				node: element,
				messageId: MESSAGE_ID_ERROR,
				data: {
					method: node.callee.property.name,
				},
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						fix(fixer) {
							const awaitToken = context.sourceCode.getFirstToken(element);
							const secondToken = context.sourceCode.getTokenAfter(awaitToken);
							return fixer.removeRange([awaitToken.range[0], secondToken.range[0]]);
						},
					},
				],
			};
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow using `await` in `Promise` method parameters.',
		},
		hasSuggestions: true,
		messages,
	},
};
