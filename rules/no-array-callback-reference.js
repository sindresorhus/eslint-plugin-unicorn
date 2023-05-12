'use strict';
const {isParenthesized} = require('@eslint-community/eslint-utils');
const {methodCallSelector} = require('./selectors/index.js');
const {isNodeMatches} = require('./utils/is-node-matches.js');
const {isNodeValueNotFunction} = require('./utils/index.js')

const ERROR_WITH_NAME_MESSAGE_ID = 'error-with-name';
const ERROR_WITHOUT_NAME_MESSAGE_ID = 'error-without-name';
const REPLACE_WITH_NAME_MESSAGE_ID = 'replace-with-name';
const REPLACE_WITHOUT_NAME_MESSAGE_ID = 'replace-without-name';
const messages = {
	[ERROR_WITH_NAME_MESSAGE_ID]: 'Do not pass function `{{name}}` directly to `.{{method}}(…)`.',
	[ERROR_WITHOUT_NAME_MESSAGE_ID]: 'Do not pass function directly to `.{{method}}(…)`.',
	[REPLACE_WITH_NAME_MESSAGE_ID]: 'Replace function `{{name}}` with `… => {{name}}({{parameters}})`.',
	[REPLACE_WITHOUT_NAME_MESSAGE_ID]: 'Replace function with `… => …({{parameters}})`.',
};

const iteratorMethods = [
	[
		'every',
		{
			ignore: [
				'Boolean',
			],
		},
	],
	[
		'filter', {
			extraSelector: '[callee.object.name!="Vue"]',
			ignore: [
				'Boolean',
			],
		},
	],
	[
		'find',
		{
			ignore: [
				'Boolean',
			],
		},
	],
	[
		'findLast',
		{
			ignore: [
				'Boolean',
			],
		},
	],
	[
		'findIndex',
		{
			ignore: [
				'Boolean',
			],
		},
	],
	[
		'findLastIndex',
		{
			ignore: [
				'Boolean',
			],
		},
	],
	[
		'flatMap',
	],
	[
		'forEach',
		{
			returnsUndefined: true,
		},
	],
	[
		'map',
		{
			extraSelector: '[callee.object.name!="types"]',
			ignore: [
				'String',
				'Number',
				'BigInt',
				'Boolean',
				'Symbol',
			],
		},
	],
	[
		'reduce',
		{
			parameters: [
				'accumulator',
				'element',
				'index',
				'array',
			],
			minParameters: 2,
		},
	],
	[
		'reduceRight',
		{
			parameters: [
				'accumulator',
				'element',
				'index',
				'array',
			],
			minParameters: 2,
		},
	],
	[
		'some',
		{
			ignore: [
				'Boolean',
			],
		},
	],
].map(([method, options]) => {
	options = {
		parameters: ['element', 'index', 'array'],
		ignore: [],
		minParameters: 1,
		extraSelector: '',
		returnsUndefined: false,
		...options,
	};
	return [method, options];
});

const ignoredCallee = [
	// http://bluebirdjs.com/docs/api/promise.map.html
	'Promise',
	'React.Children',
	'Children',
	'lodash',
	'underscore',
	'_',
	'Async',
	'async',
	'this',
	'$',
	'jQuery',
];

function getProblem(context, node, method, options) {
	const {type} = node;

	const name = type === 'Identifier' ? node.name : '';

	if (type === 'Identifier' && options.ignore.includes(name)) {
		return;
	}

	const problem = {
		node,
		messageId: name ? ERROR_WITH_NAME_MESSAGE_ID : ERROR_WITHOUT_NAME_MESSAGE_ID,
		data: {
			name,
			method,
		},
		suggest: [],
	};

	const {parameters, minParameters, returnsUndefined} = options;
	for (let parameterLength = minParameters; parameterLength <= parameters.length; parameterLength++) {
		const suggestionParameters = parameters.slice(0, parameterLength).join(', ');

		const suggest = {
			messageId: name ? REPLACE_WITH_NAME_MESSAGE_ID : REPLACE_WITHOUT_NAME_MESSAGE_ID,
			data: {
				name,
				parameters: suggestionParameters,
			},
			fix(fixer) {
				const {sourceCode} = context;
				let nodeText = sourceCode.getText(node);
				if (isParenthesized(node, sourceCode) || type === 'ConditionalExpression') {
					nodeText = `(${nodeText})`;
				}

				return fixer.replaceText(
					node,
					returnsUndefined
						? `(${suggestionParameters}) => { ${nodeText}(${suggestionParameters}); }`
						: `(${suggestionParameters}) => ${nodeText}(${suggestionParameters})`,
				);
			},
		};

		problem.suggest.push(suggest);
	}

	return problem;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const rules = {};

	for (const [method, options] of iteratorMethods) {
		const selector = [
			method === 'reduce' || method === 'reduceRight' ? '' : ':not(AwaitExpression) > ',
			methodCallSelector({
				method,
				minimumArguments: 1,
				maximumArguments: 2,
			}),
			options.extraSelector,
		].join('');

		rules[selector] = node => {
			if (isNodeMatches(node.callee.object, ignoredCallee)) {
				return;
			}

			if (node.callee.object.type === 'CallExpression' && isNodeMatches(node.callee.object.callee, ignoredCallee)) {
				return;
			}

			const [callback] = node.arguments;

			if (
				isNodeValueNotFunction(callback)
				// Ignore all `CallExpression`s include `function.bind()`
				|| callback.type == 'CallExpression'
			) {
				return
			}

			return getProblem(context, callback, method, options);
		};
	}

	return rules;
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Prevent passing a function reference directly to iterator methods.',
		},
		hasSuggestions: true,
		messages,
	},
};
