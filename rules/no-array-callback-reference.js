'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const {notFunctionSelector} = require('./utils/not-function');
const isNodeMatches = require('./utils/is-node-matches');

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
	'async'
];

function check(context, node, method, options) {
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

	context.report(problem);
}

const ignoredFirstArgumentSelector = [
	notFunctionSelector('arguments.0'),
	'[arguments.0.type!="FunctionExpression"]',
	'[arguments.0.type!="ArrowFunctionExpression"]'
].join('');

const create = context => {
	const sourceCode = context.getSourceCode();
	const rules = {};

	for (const [method, options] of iteratorMethods) {
		const selector = [
			method === 'reduce' || method === 'reduceRight' ? '' : ':not(AwaitExpression) > ',
			methodSelector({
				name: method,
				min: 1,
				max: 2
			}),
			options.extraSelector,
			ignoredFirstArgumentSelector
		].join('');

		rules[selector] = node => {
			if (
				isNodeMatches(node.callee.object, ignoredCallee) ||
				node.callee.object.type === 'ThisExpression'
			) {
				return;
			}

			const [iterator] = node.arguments;
			check(context, iterator, method, options, sourceCode);
		};
	}

	return rules;
};

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages
	}
};
