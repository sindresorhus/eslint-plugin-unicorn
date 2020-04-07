'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const ERROR_MESSAGE_ID = 'error';
const REPLACE_MESSAGE_ID = 'replace';

const iteratorMethods = [
	['every'],
	['filter'],
	['find'],
	['findIndex'],
	['flatMap'],
	['forEach'],
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
		...options
	};
	return [method, options];
});

const ignoredCallee = [
	'Promise',
	'React.children',
	'lodash',
	'underscore',
	'_',
	'Async',
	'async'
];

const toSelector = name => {
	const splitted = name.split('.');
	return `[callee.${'object.'.repeat(splitted.length)}name!="${splitted.shift()}"]`;
};

// Select all the call expressions except the ones present in the blacklist
const ignoredCalleeSelector = `${ignoredCallee.map(toSelector).join('')}`;

function check(context, node, method, options) {
	const {name: functionName} = node;
	const {ignore} = options;

	if (ignore.includes(functionName)) {
		return;
	}

	const problem = {
		node,
		messageId: ERROR_MESSAGE_ID,
		data: {
			functionName,
			methodName: method
		},
		suggest: []
	};

	const {parameters, minParameters} = options;
	for (let parameterLength = minParameters; parameterLength <= parameters.length; parameterLength++) {
		const suggestionParameters = parameters.slice(0, parameterLength).join(', ');

		const suggest = {
			messageId: REPLACE_MESSAGE_ID,
			data: {
				functionName,
				parameters: suggestionParameters
			},
			fix: fixer => fixer.replaceText(
				node,
				`(${suggestionParameters}) => ${functionName}(${suggestionParameters})`
			)
		};

		problem.suggest.push(suggest);
	}

	context.report(problem);
}

const create = context => {
	const sourceCode = context.getSourceCode();
	const rules = {};

	for (const [method, options] of iteratorMethods) {
		const selector = [
			methodSelector({
				name: method,
				min: 1,
				max: 2
			}),
			ignoredCalleeSelector
		].join('');
		rules[selector] = node => {
			const [iterator] = node.arguments;

			// TODO: support more types of iterator
			if (iterator.type !== 'Identifier') {
				return;
			}

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
		fixable: 'code',
		messages: {
			[ERROR_MESSAGE_ID]: 'Do not pass function `{{functionName}}` directly to `{{methodName}}()`.',
			[REPLACE_MESSAGE_ID]: 'Replace function `{{functionName}}` with `({{parameters}}) => {{functionName}}({parameters})`.'
		}
	}
};
