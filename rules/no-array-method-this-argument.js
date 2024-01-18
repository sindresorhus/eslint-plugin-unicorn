'use strict';
const {hasSideEffect} = require('@eslint-community/eslint-utils');
const {removeArgument} = require('./fix/index.js');
const {getParentheses, getParenthesizedText} = require('./utils/parentheses.js');
const shouldAddParenthesesToMemberExpressionObject = require('./utils/should-add-parentheses-to-member-expression-object.js');
const {isNodeMatches} = require('./utils/is-node-matches.js');
const {isNodeValueNotFunction} = require('./utils/index.js');
const {isMethodCall} = require('./ast/index.js');

const ERROR_PROTOTYPE_METHOD = 'error-prototype-method';
const ERROR_STATIC_METHOD = 'error-static-method';
const SUGGESTION_BIND = 'suggestion-bind';
const SUGGESTION_REMOVE = 'suggestion-remove';
const messages = {
	[ERROR_PROTOTYPE_METHOD]: 'Do not use the `this` argument in `Array#{{method}}()`.',
	[ERROR_STATIC_METHOD]: 'Do not use the `this` argument in `Array.from()`.',
	[SUGGESTION_REMOVE]: 'Remove the second argument.',
	[SUGGESTION_BIND]: 'Use a bound function.',
};

const ignored = [
	'lodash.every',
	'_.every',
	'underscore.every',

	'lodash.filter',
	'_.filter',
	'underscore.filter',
	'Vue.filter',
	'R.filter',

	'lodash.find',
	'_.find',
	'underscore.find',
	'R.find',

	'lodash.findLast',
	'_.findLast',
	'underscore.findLast',
	'R.findLast',

	'lodash.findIndex',
	'_.findIndex',
	'underscore.findIndex',
	'R.findIndex',

	'lodash.findLastIndex',
	'_.findLastIndex',
	'underscore.findLastIndex',
	'R.findLastIndex',

	'lodash.flatMap',
	'_.flatMap',

	'lodash.forEach',
	'_.forEach',
	'React.Children.forEach',
	'Children.forEach',
	'R.forEach',

	'lodash.map',
	'_.map',
	'underscore.map',
	'React.Children.map',
	'Children.map',
	'jQuery.map',
	'$.map',
	'R.map',

	'lodash.some',
	'_.some',
	'underscore.some',
];

function removeThisArgument(callExpression, sourceCode) {
	return fixer => removeArgument(fixer, callExpression.arguments[1], sourceCode);
}

function useBoundFunction(callExpression, sourceCode) {
	return function * (fixer) {
		yield removeThisArgument(callExpression, sourceCode)(fixer);

		const [callback, thisArgument] = callExpression.arguments;

		const callbackParentheses = getParentheses(callback, sourceCode);
		const isParenthesized = callbackParentheses.length > 0;
		const callbackLastToken = isParenthesized
			? callbackParentheses.at(-1)
			: callback;
		if (
			!isParenthesized
			&& shouldAddParenthesesToMemberExpressionObject(callback, sourceCode)
		) {
			yield fixer.insertTextBefore(callbackLastToken, '(');
			yield fixer.insertTextAfter(callbackLastToken, ')');
		}

		const thisArgumentText = getParenthesizedText(thisArgument, sourceCode);
		// `thisArgument` was a argument, no need add extra parentheses
		yield fixer.insertTextAfter(callbackLastToken, `.bind(${thisArgumentText})`);
	};
}

function getProblem({
	sourceCode,
	callExpression,
	callbackNode,
	thisArgumentNode,
	messageId,
}) {
	const {callee} = callExpression;
	const method = callee.property.name;

	const problem = {
		node: thisArgumentNode,
		messageId,
		data: {method},
	};

	const thisArgumentHasSideEffect = hasSideEffect(thisArgumentNode, sourceCode);
	const isArrowCallback = callbackNode.type === 'ArrowFunctionExpression';

	if (isArrowCallback) {
		if (thisArgumentHasSideEffect) {
			problem.suggest = [
				{
					messageId: SUGGESTION_REMOVE,
					fix: removeThisArgument(callExpression, sourceCode),
				},
			];
		} else {
			problem.fix = removeThisArgument(callExpression, sourceCode);
		}

		return problem;
	}

	problem.suggest = [
		{
			messageId: SUGGESTION_REMOVE,
			fix: removeThisArgument(callExpression, sourceCode),
		},
		{
			messageId: SUGGESTION_BIND,
			fix: useBoundFunction(callExpression, sourceCode),
		},
	];

	return problem;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	// Prototype methods
	context.on('CallExpression', (callExpression) => {
		if (
			!(
				isMethodCall(callExpression, {
					methods: [
						'every',
						'filter',
						'find',
						'findLast',
						'findIndex',
						'findLastIndex',
						'flatMap',
						'forEach',
						'map',
						'some',
					],
					argumentsLength: 2,
					optionalCall: false,
					optionalMember: false,
				})
				&& !isNodeMatches(callExpression.callee, ignored)
				&& !isNodeValueNotFunction(callExpression.arguments[0])
			)
		) {
			return;
		}

		return getProblem({
			sourceCode,
			callExpression,
			callbackNode: callExpression.arguments[0],
			thisArgumentNode: callExpression.arguments[1],
			messageId: ERROR_PROTOTYPE_METHOD,
		});
	});

	// `Array.from`
	context.on('CallExpression', callExpression => {
		if (
			!(
				isMethodCall(callExpression, {
					object: 'Array',
					method: 'from',
					argumentsLength: 3,
					optionalCall: false,
					optionalMember: false,
				})
				&& !isNodeValueNotFunction(callExpression.arguments[0])
			)
		) {
			return;
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow using the `this` argument in array methods.',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};
