'use strict';
const {hasSideEffect, isCommaToken, isSemicolonToken} = require('@eslint-community/eslint-utils');
const getCallExpressionArgumentsText = require('./utils/get-call-expression-arguments-text.js');
const isSameReference = require('./utils/is-same-reference.js');
const {isNodeMatches} = require('./utils/is-node-matches.js');
const getPreviousNode = require('./utils/get-previous-node.js');
const {isMethodCall} = require('./ast/index.js');

const ERROR = 'error';
const SUGGESTION = 'suggestion';
const messages = {
	[ERROR]: 'Do not call `Array#push()` multiple times.',
	[SUGGESTION]: 'Merge with previous one.',
};

const isArrayPushCall = node =>
	node
	&& node.parent.type === 'ExpressionStatement'
	&& node.parent.expression === node
	&& isMethodCall(node, {
		method: 'push',
		optionalCall: false,
		optionalMember: false,
	});

function getFirstArrayPushCall(secondCall, sourceCode) {
	const firstCall = getPreviousNode(secondCall.parent, sourceCode)?.expression;
	if (isArrayPushCall(firstCall)) {
		return firstCall;
	}
}

function create(context) {
	const {ignore} = {
		ignore: [],
		...context.options[0],
	};
	const ignoredObjects = [
		'stream',
		'this',
		'this.stream',
		'process.stdin',
		'process.stdout',
		'process.stderr',
		...ignore,
	];
	const {sourceCode} = context;

	return {
		CallExpression(secondCall) {
			if (!isArrayPushCall(secondCall)) {
				return;
			}

			const secondCallArray = secondCall.callee.object;

			if (isNodeMatches(secondCallArray, ignoredObjects)) {
				return;
			}

			const firstCall = getFirstArrayPushCall(secondCall, sourceCode);
			if (!firstCall) {
				return;
			}

			const firstCallArray = firstCall.callee.object;

			// Not same array
			if (!isSameReference(firstCallArray, secondCallArray)) {
				return;
			}

			const secondCallArguments = secondCall.arguments;
			const problem = {
				node: secondCall.callee.property,
				messageId: ERROR,
			};

			const fix = function * (fixer) {
				if (secondCallArguments.length > 0) {
					const text = getCallExpressionArgumentsText(secondCall, sourceCode);

					const [penultimateToken, lastToken] = sourceCode.getLastTokens(firstCall, 2);
					yield (
						isCommaToken(penultimateToken)
							? fixer.insertTextAfter(penultimateToken, ` ${text}`)
							: fixer.insertTextBefore(lastToken, firstCall.arguments.length > 0 ? `, ${text}` : text)
					);
				}

				const firstExpression = firstCall.parent;
				const secondExpression = secondCall.parent;
				const shouldKeepSemicolon = !isSemicolonToken(sourceCode.getLastToken(firstExpression))
					&& isSemicolonToken(sourceCode.getLastToken(secondExpression));

				yield fixer.replaceTextRange(
					[firstExpression.range[1], secondExpression.range[1]],
					shouldKeepSemicolon ? ';' : '',
				);
			};

			if (secondCallArguments.some(element => hasSideEffect(element, sourceCode))) {
				problem.suggest = [
					{
						messageId: SUGGESTION,
						fix,
					},
				];
			} else {
				problem.fix = fix;
			}

			return problem;
		},
	};
}

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			ignore: {
				type: 'array',
				uniqueItems: true,
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce combining multiple `Array#push()` into one call.',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		messages,
	},
};
