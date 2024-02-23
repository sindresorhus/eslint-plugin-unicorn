'use strict';
const {
	isOpeningBracketToken,
	isClosingBracketToken,
	isCommaToken,
} = require('@eslint-community/eslint-utils');
const {isMethodCall} = require('./ast/index.js');
const {
	getParenthesizedText,
	isParenthesized,
	needsSemicolon,
	shouldAddParenthesesToAwaitExpressionArgument,
	shouldAddParenthesesToMemberExpressionObject,
	isOpeningParenToken,
	isClosingParenToken,
} = require('./utils/index.js');

const MESSAGE_ID_ERROR = 'no-single-promise-in-promise-methods/error';
const MESSAGE_ID_SUGGESTION_UNWRAP = 'no-single-promise-in-promise-methods/unwrap';
const MESSAGE_ID_SUGGESTION_SWITCH_TO_PROMISE_RESOLVE = 'no-single-promise-in-promise-methods/use-promise-resolve';
const messages = {
	[MESSAGE_ID_ERROR]: 'Wrapping a single element array with `Promise.{{method}}()` is unnecessary.',
	[MESSAGE_ID_SUGGESTION_UNWRAP]: 'Use the value directly.',
	[MESSAGE_ID_SUGGESTION_SWITCH_TO_PROMISE_RESOLVE]: 'Wrap the value with `Promise.resolve()`.',
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

const wrapText = (sourceCode, node, element, text, prefix, suffix) => {
	if (prefix || suffix) {
		return `${prefix}${text}${suffix}`;
	}

	if (!isParenthesized(element, sourceCode)
	&& shouldAddParenthesesToMemberExpressionObject(element, sourceCode)) {
		return `(${text})`;
	}

	return text;
};

const getText = (sourceCode, node, element, prefix = '', suffix = '') => {
	const previousToken = sourceCode.getTokenBefore(node);
	const parenthesizedText = getParenthesizedText(element, sourceCode);
	const wrappedText = wrapText(sourceCode, node, element, parenthesizedText, prefix, suffix);

	return needsSemicolon(previousToken, sourceCode, wrappedText) ? `;${wrappedText}` : wrappedText;
};

const unwrapAwaitedCallExpression = (callExpression, sourceCode) => fixer => {
	const [promiseNode] = callExpression.arguments[0].elements;
	let text = getParenthesizedText(promiseNode, sourceCode);

	if (
		!isParenthesized(promiseNode, sourceCode)
		&& shouldAddParenthesesToAwaitExpressionArgument(promiseNode)
	) {
		text = `(${text})`;
	}

	// The next node is already behind a `CallExpression`, there should be no ASI problem

	return fixer.replaceText(callExpression, text);
};

const unwrapNonAwaitedCallExpression = (node, sourceCode) => fixer =>
	fixer.replaceText(node, getText(sourceCode, node, node.arguments[0].elements[0]));

const switchToPromiseResolve = (callExpression, sourceCode) => function * (fixer) {
	const methodNameNode = callExpression.callee.property;
	/*
	```
	Promise.all([promise,])
	//      ^^^
	```
	*/
	yield fixer.replaceText(methodNameNode, 'resolve');

	const [arrayExpression] = callExpression.arguments;
	/*
	```
	Promise.all([promise,])
	//          ^
	```
	*/
	const openingBracketToken = sourceCode.getFirstToken(arrayExpression);
	/*
	```
	Promise.all([promise,])
	//                  ^
	//                   ^
	```
	*/
	const [
		penultimateToken,
		closingBracketToken,
	] = sourceCode.getLastTokens(arrayExpression, 2);

	yield fixer.remove(openingBracketToken);
	yield fixer.remove(closingBracketToken);

	if (isCommaToken(penultimateToken)) {
		yield fixer.remove(penultimateToken);
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({

	CallExpression(callExpression) {
		if (!isPromiseMethodCallWithSingleElementArray(callExpression)) {
			return;
		}

		const problem = {
			node: callExpression.arguments[0],
			messageId: MESSAGE_ID_ERROR,
			data: {
				method: callExpression.callee.property.name,
			},
		};

		const {sourceCode} = context;

		if (callExpression.parent.type === 'AwaitExpression') {
			problem.fix = unwrapAwaitedCallExpression(callExpression, sourceCode);
			return problem;
		}

		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION_UNWRAP,
				fix: unwrapNonAwaitedCallExpression(callExpression, sourceCode),
			},
			{
				messageId: MESSAGE_ID_SUGGESTION_SWITCH_TO_PROMISE_RESOLVE,
				fix: switchToPromiseResolve(callExpression, sourceCode),
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
			description: 'Disallow passing single-element arrays to `Promise` methods.',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};
