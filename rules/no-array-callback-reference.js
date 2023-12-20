'use strict';
const {isParenthesized} = require('@eslint-community/eslint-utils');
const {isMethodCall} = require('./ast/index.js');
const {isNodeMatches, isNodeValueNotFunction} = require('./utils/index.js');

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

const isAwaitExpressionArgument = node => node.parent.type === 'AwaitExpression' && node.parent.argument === node;

const iteratorMethods = new Map([
	{
		method: 'every',
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'filter',
		test: node => !(node.callee.object.type === 'Identifier' && node.callee.object.name === 'Vue'),
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'find',
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'findLast',
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'findIndex',
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'findLastIndex',
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'flatMap',
	},
	{
		method: 'forEach',
		returnsUndefined: true,
	},
	{
		method: 'map',
		test: node => !(node.callee.object.type === 'Identifier' && node.callee.object.name === 'types'),
		ignore: [
			'String',
			'Number',
			'BigInt',
			'Boolean',
			'Symbol',
		],
	},
	{
		method: 'reduce',
		parameters: [
			'accumulator',
			'element',
			'index',
			'array',
		],
		minParameters: 2,
	},
	{
		method: 'reduceRight',
		parameters: [
			'accumulator',
			'element',
			'index',
			'array',
		],
		minParameters: 2,
	},
	{
		method: 'some',
		ignore: [
			'Boolean',
		],
	},
].map(({
	method,
	parameters = ['element', 'index', 'array'],
	ignore = [],
	minParameters = 1,
	returnsUndefined = false,
	test,
}) => [method, {
	minParameters,
	parameters,
	returnsUndefined,
	test(node) {
		if (
			method !== 'reduce'
			&& method !== 'reduceRight'
			&& isAwaitExpressionArgument(node)
		) {
			return false;
		}

		if (isNodeMatches(node.callee.object, ignoredCallee)) {
			return false;
		}

		if (node.callee.object.type === 'CallExpression' && isNodeMatches(node.callee.object.callee, ignoredCallee)) {
			return false;
		}

		const [callback] = node.arguments;

		if (callback.type === 'Identifier' && ignore.includes(callback.name)) {
			return false;
		}

		return !test || test(node);
	},
}]));

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
const create = context => ({
	CallExpression(node) {
		if (
			!isMethodCall(node, {
				minimumArguments: 1,
				maximumArguments: 2,
				optionalCall: false,
				optionalMember: false,
				computed: false,
			})
			|| node.callee.property.type !== 'Identifier'
		) {
			return;
		}

		const methodNode = node.callee.property;
		const methodName = methodNode.name;
		if (!iteratorMethods.has(methodName)) {
			return;
		}

		const [callback] = node.arguments;

		if (
			callback.type === 'FunctionExpression'
			|| callback.type === 'ArrowFunctionExpression'
			// Ignore all `CallExpression`s include `function.bind()`
			|| callback.type === 'CallExpression'
			|| isNodeValueNotFunction(callback)
		) {
			return;
		}

		const options = iteratorMethods.get(methodName);

		if (!options.test(node)) {
			return;
		}

		return getProblem(context, callback, methodName, options);
	},
});

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
