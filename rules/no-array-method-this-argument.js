'use strict';
const {hasSideEffect} = require('eslint-utils');
const {methodCallSelector} = require('./selectors/index.js');
const {removeArgument} = require('./fix/index.js');
const {getParentheses, getParenthesizedText} = require('./utils/parentheses.js');
const shouldAddParenthesesToMemberExpressionObject = require('./utils/should-add-parentheses-to-member-expression-object.js');

const ERROR = 'error';
const SUGGESTION_BIND = 'suggestion-bind';
const SUGGESTION_REMOVE = 'suggestion-remove';
const messages = {
	[ERROR]: 'Do not use the `this` argument in `Array#{{method}}()`.',
	[SUGGESTION_REMOVE]: 'Remove the second argument.',
	[SUGGESTION_BIND]: 'Use a bound function.'
};

const selector = methodCallSelector({
	names: [
		'every',
		'filter',
		'find',
		'findIndex',
		'flatMap',
		'forEach',
		'map',
		'some'
	],
	length: 2
});

function removeThisArgument(callExpression, sourceCode) {
	return fixer => removeArgument(fixer, callExpression.arguments[1], sourceCode);
}

function useBoundFunction(callExpression, sourceCode) {
	return function * (fixer) {
		yield removeThisArgument(callExpression, sourceCode)(fixer);

		const [callback, thisArgument] = callExpression.arguments;

		const callbackParentheses = getParentheses(callback, sourceCode);
		const isParenthesized = callbackParentheses.length > 0;
		const callbackLastToken = isParenthesized ?
			callbackParentheses[callbackParentheses.length - 1] :
			callback;
		if (
			!isParenthesized &&
			shouldAddParenthesesToMemberExpressionObject(callback, sourceCode)
		) {
			yield fixer.insertTextBefore(callbackLastToken, '(');
			yield fixer.insertTextAfter(callbackLastToken, ')');
		}

		const thisArgumentText = getParenthesizedText(thisArgument, sourceCode);
		// `thisArgument` was a argument, no need add extra parentheses
		yield fixer.insertTextAfter(callbackLastToken, `.bind(${thisArgumentText})`);
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[selector](callExpression) {
			const method = callExpression.callee.property.name;
			const [callback, thisArgument] = callExpression.arguments;

			const problem = {
				node: thisArgument,
				messageId: ERROR,
				data: {method}
			};

			const thisArgumentHasSideEffect = hasSideEffect(thisArgument, sourceCode);
			const isArrowCallback = callback.type === 'ArrowFunctionExpression';

			if (isArrowCallback) {
				if (thisArgumentHasSideEffect) {
					problem.suggest = [
						{
							messageId: SUGGESTION_REMOVE,
							fix: removeThisArgument(callExpression, sourceCode)
						}
					];
				} else {
					problem.fix = removeThisArgument(callExpression, sourceCode);
				}

				return problem;
			}

			problem.suggest = [
				{
					messageId: SUGGESTION_REMOVE,
					fix: removeThisArgument(callExpression, sourceCode)
				},
				{
					messageId: SUGGESTION_BIND,
					fix: useBoundFunction(callExpression, sourceCode)
				}
			];

			return problem;
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow using the `this` argument in array methods.'
		},
		fixable: 'code',
		messages,
		hasSuggestions: true
	}
};
