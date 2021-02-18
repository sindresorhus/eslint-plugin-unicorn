'use strict';
const {hasSideEffect, isCommaToken, isSemicolonToken} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const getCallExpressionArgumentsText = require('./utils/get-call-expression-arguments-text');

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
	throw new Error('Cannot find the first `Array#push()` call.\nPlease open an issue at https://github.com/sindresorhus/eslint-plugin-unicorn/issues/new?title=%60no-array-push-push%60%3A%20Cannot%20find%20first%20%60push()%60');
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

				const shouldKeepSemicolon = !isSemicolonToken(sourceCode.getLastToken(firstExpression)) &&
					isSemicolonToken(sourceCode.getLastToken(secondExpression));

				yield fixer.replaceTextRange(
					[firstExpression.range[1], secondExpression.range[1]],
					shouldKeepSemicolon ? ';' : ''
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
