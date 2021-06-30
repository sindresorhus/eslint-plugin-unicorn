'use strict';
const {isParenthesized} = require('eslint-utils');
const {methodCallSelector, notFunctionSelector} = require('./selectors/index.js');
const {isNodeMatches} = require('./utils/is-node-matches.js');

const ERROR_WITH_NAME_MESSAGE_ID = 'error-with-name';
const ERROR_WITHOUT_NAME_MESSAGE_ID = 'error-without-name';
const REPLACE_WITH_NAME_MESSAGE_ID = 'replace-with-name';
const REPLACE_WITHOUT_NAME_MESSAGE_ID = 'replace-without-name';
const messages = {
	[ERROR_WITH_NAME_MESSAGE_ID]: 'Do not pass function `{{name}}` directly to `.{{method}}(…)`.',
	[ERROR_WITHOUT_NAME_MESSAGE_ID]: 'Do not pass function directly to `.{{method}}(…)`.',
	[REPLACE_WITH_NAME_MESSAGE_ID]: 'Replace function `{{name}}` with `… => {{name}}({{parameters}})`.',
	[REPLACE_WITHOUT_NAME_MESSAGE_ID]: 'Replace function with `… => …({{parameters}})`.'
};

const iteratorMethods = [
	['every'],
	[
		'filter', {
			extraSelector: '[callee.object.name!="Vue"]'
		}
	],
	['find'],
	['findIndex'],
	['flatMap'],
	[
		'forEach', {
			returnsUndefined: true
		}
	],
	['map'],
	[
		'reduce', {
			parameters: [
				'accumulator',
				'element',
				'index',
				'array'
			],
			minParameters: 2,
			ignore: []
		}
	],
	[
		'reduceRight', {
			parameters: [
				'accumulator',
				'element',
				'index',
				'array'
			],
			minParameters: 2,
			ignore: []
		}
	],
	['some']
].map(([method, options]) => {
	options = {
		parameters: ['element', 'index', 'array'],
		ignore: ['Boolean'],
		minParameters: 1,
		extraSelector: '',
		returnsUndefined: false,
		...options
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
	'this'
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
			method
		},
		suggest: []
	};

	const {parameters, minParameters, returnsUndefined} = options;
	for (let parameterLength = minParameters; parameterLength <= parameters.length; parameterLength++) {
		const suggestionParameters = parameters.slice(0, parameterLength).join(', ');

		const suggest = {
			messageId: name ? REPLACE_WITH_NAME_MESSAGE_ID : REPLACE_WITHOUT_NAME_MESSAGE_ID,
			data: {
				name,
				parameters: suggestionParameters
			},
			fix: fixer => {
				const sourceCode = context.getSourceCode();
				let nodeText = sourceCode.getText(node);
				if (isParenthesized(node, sourceCode) || type === 'ConditionalExpression') {
					nodeText = `(${nodeText})`;
				}

				return fixer.replaceText(
					node,
					returnsUndefined ?
						`(${suggestionParameters}) => { ${nodeText}(${suggestionParameters}); }` :
						`(${suggestionParameters}) => ${nodeText}(${suggestionParameters})`
				);
			}
		};

		problem.suggest.push(suggest);
	}

	return problem;
}

const ignoredFirstArgumentSelector = [
	notFunctionSelector('arguments.0'),
	// Ignore all `CallExpression`s include `function.bind()`
	'[arguments.0.type!="CallExpression"]',
	'[arguments.0.type!="FunctionExpression"]',
	'[arguments.0.type!="ArrowFunctionExpression"]'
].join('');

const create = context => {
	const sourceCode = context.getSourceCode();
	const rules = {};

	for (const [method, options] of iteratorMethods) {
		const selector = [
			method === 'reduce' || method === 'reduceRight' ? '' : ':not(AwaitExpression) > ',
			methodCallSelector({
				name: method,
				min: 1,
				max: 2
			}),
			options.extraSelector,
			ignoredFirstArgumentSelector
		].join('');

		rules[selector] = node => {
			if (isNodeMatches(node.callee.object, ignoredCallee)) {
				return;
			}

			const [iterator] = node.arguments;
			return getProblem(context, iterator, method, options, sourceCode);
		};
	}

	return rules;
};

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Prevent passing a function reference directly to iterator methods.'
		},
		messages,
		hasSuggestions: true
	}
};
