'use strict';
const isPromiseMethodWithArray = require('./utils/is-promise-method-with-array.js');

const MESSAGE_ID_ERROR = 'no-single-promise-in-promise-methods/error';
const MESSAGE_ID_SUGGESTION_1 = 'no-single-promise-in-promise-methods/suggestion-1';
const MESSAGE_ID_SUGGESTION_2 = 'no-single-promise-in-promise-methods/suggestion-2';
const messages = {
	[MESSAGE_ID_ERROR]: 'Parameter in `Promise.{{method}}` should not be a single element array.',
	[MESSAGE_ID_SUGGESTION_1]: 'Use the value directly.',
	[MESSAGE_ID_SUGGESTION_2]: 'Wrap the value in a `Promise.resolve`.',
};
const METHODS = ['all', 'any', 'race'];

const isPromiseMethodWithSinglePromise = (node, methods) => {
	const types = new Set(['CallExpression', 'Identifier', 'MemberExpression']);

	if (!isPromiseMethodWithArray(node, methods) || node.arguments[0].elements.length !== 1) {
		return false;
	}

	const [element] = node.arguments[0].elements;

	return types.has(element.type)
	|| (element.type === 'AwaitExpression' && types.has(element.argument.type));
};

const getAutoFixer = ({sourceCode}, node) => fixer => {
	const [element] = node.arguments[0].elements;
	const elementWithoutAwait = element.type === 'AwaitExpression' ? element.argument : element;

	return fixer.replaceText(node, sourceCode.getText(elementWithoutAwait));
};

const getSuggestion1Fixer = ({sourceCode}, node) => fixer =>
	fixer.replaceText(node, sourceCode.getText(node.arguments[0].elements[0]));

const getSuggestion2Fixer = ({sourceCode}, node) => fixer => {
	const text = sourceCode.getText(node.arguments[0].elements[0]);

	return fixer.replaceText(node, `Promise.resolve(${text})`);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(node) {
		if (!isPromiseMethodWithSinglePromise(node, METHODS)) {
			return;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID_ERROR,
			data: {
				method: node.callee.property.name,
			},
		};

		if (node.parent.type === 'AwaitExpression') {
			problem.fix = getAutoFixer(context, node);
			return problem;
		}

		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION_1,
				fix: getSuggestion1Fixer(context, node),
			},
			{
				messageId: MESSAGE_ID_SUGGESTION_2,
				fix: getSuggestion2Fixer(context, node),
			},
		];

		return problem;
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow using `Promise` method with a single element array as parameter.',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};
