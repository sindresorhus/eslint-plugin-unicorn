'use strict';
const {isMethodCall} = require('./ast/index.js');

const MESSAGE_ID_ERROR = 'no-single-promise-in-promise-methods/error';
const MESSAGE_ID_SUGGESTION_1 = 'no-single-promise-in-promise-methods/suggestion-1';
const MESSAGE_ID_SUGGESTION_2 = 'no-single-promise-in-promise-methods/suggestion-2';
const messages = {
	[MESSAGE_ID_ERROR]: 'Parameter in `Promise.{{method}}` should not be a single element array.',
	[MESSAGE_ID_SUGGESTION_1]: 'Use the value directly.',
	[MESSAGE_ID_SUGGESTION_2]: 'Wrap the value in a `Promise.resolve`.',
};
const METHODS = ['all', 'any', 'race'];

const isPromiseMethodCallWithSingleElementArray = node =>
	isMethodCall(node, {
		object: 'Promise',
		methods: METHODS,
		optionalMember: false,
		optionalCall: false,
		argumentsLength: 1,
	})
	&& node.arguments[0].type === 'ArrayExpression'
	&& node.arguments[0].elements.length === 1
	&& node.arguments[0].elements[0] !== null
	&& node.arguments[0].elements[0].type !== 'SpreadElement';

const getText = ({sourceCode}, element) => {
	const text = sourceCode.getText(element);

	return element.type === 'SequenceExpression' ? `(${text})` : text;
};

const getAutoFixer = (context, node) => fixer => {
	const [element] = node.arguments[0].elements;
	const elementWithoutAwait = element.type === 'AwaitExpression' ? element.argument : element;

	return fixer.replaceText(node, getText(context, elementWithoutAwait));
};

const getSuggestion1Fixer = (context, node) => fixer =>
	fixer.replaceText(node, getText(context, node.arguments[0].elements[0]));

const getSuggestion2Fixer = (context, node) => fixer => {
	const text = getText(context, node.arguments[0].elements[0]);

	return fixer.replaceText(node, `Promise.resolve(${text})`);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(callExpression) {
		if (!isPromiseMethodCallWithSingleElementArray(callExpression)) {
			return;
		}

		const problem = {
			node: callExpression,
			messageId: MESSAGE_ID_ERROR,
			data: {
				method: callExpression.callee.property.name,
			},
		};

		if (callExpression.parent.type === 'AwaitExpression') {
			problem.fix = getAutoFixer(context, callExpression);
			return problem;
		}

		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION_1,
				fix: getSuggestion1Fixer(context, callExpression),
			},
			{
				messageId: MESSAGE_ID_SUGGESTION_2,
				fix: getSuggestion2Fixer(context, callExpression),
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
