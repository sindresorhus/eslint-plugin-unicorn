'use strict';
const isPromiseMethodWithArray = require('./utils/is-promise-method-with-array.js');

const MESSAGE_ID_ERROR = 'no-await-in-promise-methods/error';
const MESSAGE_ID_SUGGESTION = 'no-await-in-promise-methods/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Parameters in `Promise.{{method}}` should not be awaited.',
	[MESSAGE_ID_SUGGESTION]: 'Remove `await`.',
};
const METHODS = ['all', 'allSettled', 'any', 'race'];

const getArrayElements = node => node.arguments[0].elements;

const getMethodName = node => node.callee.property.name;

const getFixer = ({sourceCode}, awaitedElements) => function * (fixer) {
	for (const awaitedElement of awaitedElements) {
		const firstToken = sourceCode.getFirstToken(awaitedElement);
		const secondToken = sourceCode.getTokenAfter(firstToken);

		yield fixer.removeRange([firstToken.range[0], secondToken.range[0]]);
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(node) {
		if (!isPromiseMethodWithArray(node, METHODS)) {
			return;
		}

		const awaitedElements = getArrayElements(node).filter(element => element?.type === 'AwaitExpression');

		if (awaitedElements.length === 0) {
			return;
		}

		context.report({
			node,
			messageId: MESSAGE_ID_ERROR,
			data: {
				method: getMethodName(node),
			},
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: getFixer(context, awaitedElements),
				},
			],
		});
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
