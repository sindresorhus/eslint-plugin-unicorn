'use strict';
const {hasSideEffect, isCommaToken, isSemicolonToken} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const getCallExpressionArgumentsText = require('./utils/get-call-expression-arguments-text');
const isSameReference = require('./utils/is-same-reference');
const {isNodeMatches} = require('./utils/is-node-matches');

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
	const {ignore} = {
		ignore: [],
		...context.options[0]
	};
	const ignoredObjects = ['stream', 'this', 'this.stream', ...ignore];
	const sourceCode = context.getSourceCode();

	return {
		[selector](secondExpression) {
			const secondCall = secondExpression.expression;
			const secondCallArray = secondCall.callee.object;

			if (isNodeMatches(secondCallArray, ignoredObjects)) {
				return;
			}

			const firstExpression = getFirstExpression(secondExpression, sourceCode);
			const firstCall = firstExpression.expression;
			const firstCallArray = firstCall.callee.object;

			// Not same array
			if (!isSameReference(firstCallArray, secondCallArray)) {
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

			if (secondCallArguments.some(element => hasSideEffect(element, sourceCode))) {
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

const schema = [
	{
		type: 'object',
		properties: {
			ignore: {
				type: 'array',
				uniqueItems: true
			}
		},
		additionalProperties: false
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce combining multiple `Array#push()` into one call.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages,
		schema
	}
};
