'use strict';
const {checkVueTemplate} = require('./utils/rule.js');
const {getParenthesizedRange} = require('./utils/parentheses.js');
const {replaceNodeOrTokenAndSpacesBefore, fixSpaceAroundKeyword} = require('./fix/index.js');
const {builtinErrors} = require('./error-message.js');
const typedArray = require('./shared/typed-array.js');

const isInstanceofToken = token => token.value === 'instanceof' && token.type === 'Keyword';

const MESSAGE_ID = 'no-instanceof-builtin-object';
const messages = {
	[MESSAGE_ID]: 'Unsafe instanceof should not be used to check type.',
};

const looseStrategyConstructors = new Set([
	'String',
	'Number',
	'Boolean',
	'BigInt',
	'Symbol',
	'Array',
	'Function'
]);

const strictStrategyConstructors = new Set([
	// Error types
	...builtinErrors,

	// Collection types
	'Map',
	'Set',
	'WeakMap',
	'WeakRef',
	'WeakSet',

	// Arrays and Typed Arrays
	'ArrayBuffer',
	...typedArray,

	// Data types
	'Object',

	// Regular Expressions
	'RegExp',

	// Async and functions
	'Promise',
	'Proxy',

	// Other
	'DataView',
	'Date',
	'SharedArrayBuffer',
	'FinalizationRegistry',
]);

const fixByReplaceMethod = function * ({fixer, node, sourceCode, tokenStore, instanceofToken}, method) {
	const {left, right} = node;

	yield * fixSpaceAroundKeyword(fixer, node, sourceCode);

	const range = getParenthesizedRange(left, tokenStore);
	yield fixer.insertTextBeforeRange(range, method + '(');
	yield fixer.insertTextAfterRange(range, ')');

	yield * replaceNodeOrTokenAndSpacesBefore(instanceofToken, '', fixer, sourceCode, tokenStore);
	yield * replaceNodeOrTokenAndSpacesBefore(right, '', fixer, sourceCode, tokenStore);
};

const fixByTypeof = function * ({fixer, node, sourceCode, tokenStore, instanceofToken}) {
	const {left, right} = node;

	// Check if the node is in a Vue template expression
	const vueExpressionContainer = sourceCode.getAncestors(node).findLast(ancestor => ancestor.type === 'VExpressionContainer');

	// Get safe quote
	const safeQuote = vueExpressionContainer ? (sourceCode.getText(vueExpressionContainer)[0] === '"' ? '\'' : '"') : '\'';

	yield * fixSpaceAroundKeyword(fixer, node, sourceCode);

	const leftRange = getParenthesizedRange(left, tokenStore);
	yield fixer.insertTextBeforeRange(leftRange, 'typeof ');

	yield fixer.replaceText(instanceofToken, '===');

	const rightRange = getParenthesizedRange(right, tokenStore);

	yield fixer.replaceTextRange(rightRange, safeQuote + sourceCode.getText(right).toLowerCase() + safeQuote);
};

const getInstanceOfToken = (sourceCode, node) => {
	const {left} = node;

	let tokenStore = sourceCode;
	let instanceofToken = tokenStore.getTokenAfter(left, isInstanceofToken);
	if (!instanceofToken && sourceCode.parserServices.getTemplateBodyTokenStore) {
		tokenStore = sourceCode.parserServices.getTemplateBodyTokenStore();
		instanceofToken = tokenStore.getTokenAfter(left, isInstanceofToken);
	}

	return {tokenStore, instanceofToken};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {
		useErrorIsError = false,
		strategy = 'loose',
		include = [],
		exclude = []
	} = context.options[0] ?? {};

	const {sourceCode} = context;

	return {
		/** @param {import('estree').BinaryExpression} node */
		'BinaryExpression[operator="instanceof"]'(node) {
			const {right} = node;

			if (right.type !== 'Identifier' || exclude.includes(right.name)) {
				return;
			}

			if (!looseStrategyConstructors.has(right.name) && !strictStrategyConstructors.has(right.name) && !include.includes(right.name)) {
				return;
			}

			const {tokenStore, instanceofToken} = getInstanceOfToken(sourceCode, node);

			/** @type {import('eslint').Rule.ReportDescriptor} */
			const problem = {
				node,
				messageId: MESSAGE_ID,
			};

			// Loose strategy by default
			if (looseStrategyConstructors.has(right.name)) {
				if (right.name === 'Array') {
					problem.fix = fixer => fixByReplaceMethod({
						fixer, node, sourceCode, tokenStore, instanceofToken,
					}, 'Array.isArray');

					return problem;
				}

				problem.fix = fixer => fixByTypeof({
					fixer, node, sourceCode, tokenStore, instanceofToken,
				});

				return problem;
			}

			if (strategy !== 'strict' && include.length === 0) {
				return;
			}

			// Strict strategy
			if (right.name === 'Error' && useErrorIsError) {
				problem.fix = fixer => fixByReplaceMethod({
					fixer, node, sourceCode, tokenStore, instanceofToken,
				}, 'Error.isError');
			}

			return problem;
		},
	};
};

const schema = [
	{
		type: 'object',
		properties: {
			useErrorIsError: {
				type: 'boolean',
			},
			strategy: {
				enum: [
					'loose',
					'strict',
				],
			},
			include: {
				type: 'array',
				items: {
					type: 'string',
				},
			},
			exclude: {
				type: 'array',
				items: {
					type: 'string',
				},
			},
		},
		additionalProperties: false,
	},
];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create: checkVueTemplate(create),
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow `instanceof` on built-in objects',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{
			useErrorIsError: false,
			strategy: 'loose',
			include: [],
			exclude: [],
		}],
		messages,
	},
};
