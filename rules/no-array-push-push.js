'use strict';
const {hasSideEffect, isCommaToken, isOpeningParenToken} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const ERROR = 'error';
const SUGGESTION = 'suggestion';
const messages = {
	[ERROR]: 'Do not call `Array#push()` multiple times.',
	[SUGGESTION]: 'Merge with previous one.'
};

const arrayPushExpressionStatement = [
	'ExpressionStatement',
	methodSelector({
		name: 'push',
		property: 'expression'
	})
].join('');

const selector = `${arrayPushExpressionStatement} + ${arrayPushExpressionStatement}`;

const getCallExpressionArgumentsText = (node, sourceCode) => {
	const openingParenthesisToken = sourceCode.getTokenAfter(node.callee, isOpeningParenToken);
	const closingParenthesisToken = sourceCode.getLastToken(node);

	return sourceCode.text.slice(
		openingParenthesisToken.range[1],
		closingParenthesisToken.range[0]
	);
};

function getFirstExpression(node, sourceCode) {
	const {parent} = node;
	const visitorKeys = sourceCode.visitorKeys[parent.type] || Object.keys(parent);

	for (const property of visitorKeys) {
		const value = parent[property];
		if (Array.isArray(value)) {
			const index = value.indexOf(node);

			if (index !== -1) {
				return value[index - 1];
			}
		}
	}

	/* istanbul ignore next */
	throw new Error('Can not find the first `Array#push()` call.');
}

function create(context) {
	const sourceCode = context.getSourceCode();

	return {
		[selector](secondExpression) {
			const firstExpression = getFirstExpression(secondExpression, sourceCode);
			const firstCall = firstExpression.expression;
			const secondCall = secondExpression.expression;

			const firstCallArray = firstCall.callee.object;
			const secondCallArray = secondCall.callee.object;

			// Not same array
			if (sourceCode.getText(firstCallArray) !== sourceCode.getText(secondCallArray)) {
				return;
			}

			const secondCallArguments = secondCall.arguments;
			const problem = {
				node: secondCall.callee.property,
				messageId: ERROR
			};

			const fix = function * (fixer) {
				if (secondCallArguments.length > 0) {
					const text = getCallExpressionArgumentsText(secondCall, sourceCode);

					const [penultimateToken, lastToken] = sourceCode.getLastTokens(firstCall, 2);
					yield (isCommaToken(penultimateToken) ? fixer.insertTextAfter(penultimateToken, ` ${text}`) : fixer.insertTextBefore(
						lastToken,
						firstCall.arguments.length > 0 ? `, ${text}` : text
					));
				}

				yield fixer.replaceTextRange(
					[firstExpression.range[1], secondExpression.range[1]],
					''
				);
			};

			if (
				hasSideEffect(firstCallArray, sourceCode) ||
				secondCallArguments.some(element => hasSideEffect(element, sourceCode))
			) {
				problem.suggest = [
					{
						messageId: SUGGESTION,
						fix
					}
				];
			} else {
				problem.fix = fix;
			}

			context.report(problem);
		}
	};
}

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
