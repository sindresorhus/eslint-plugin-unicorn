'use strict';
const {get} = require('lodash');
const {methodCallSelector} = require('./selectors/index.js');
const {arrayPrototypeMethodSelector, notFunctionSelector, matches} = require('./selectors/index.js');

const MESSAGE_ID = 'no-reduce';
const messages = {
	[MESSAGE_ID]: '`Array#{{method}}()` is not allowed',
};

const prototypeSelector = method => [
	methodCallSelector(method),
	arrayPrototypeMethodSelector({
		path: 'callee.object',
		methods: ['reduce', 'reduceRight'],
	}),
].join('');
const selector = matches([
	// `array.{reduce,reduceRight}()`
	[
		methodCallSelector({methods: ['reduce', 'reduceRight'], minimumArguments: 1, maximumArguments: 2}),
		notFunctionSelector('arguments.0'),
		' > .callee > .property',
	].join(''),
	// `[].{reduce,reduceRight}.call()` and `Array.{reduce,reduceRight}.call()`
	[
		prototypeSelector('call'),
		notFunctionSelector('arguments.1'),
		' > .callee > .object > .property',
	].join(''),
	// `[].{reduce,reduceRight}.apply()` and `Array.{reduce,reduceRight}.apply()`
	[
		prototypeSelector('apply'),
		' > .callee > .object > .property',
	].join(''),
]);

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			allowSimpleOperations: {
				type: 'boolean',
				default: true,
			},
		},
	},
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {allowSimpleOperations} = {allowSimpleOperations: true, ...context.options[0]};

	return {
		[selector](node) {
			const callback = get(node, 'parent.parent.arguments[0]', {});
			const problem = {
				node,
				messageId: MESSAGE_ID,
				data: {method: node.name},
			};

			if (!allowSimpleOperations) {
				return problem;
			}

			if (callback.type === 'ArrowFunctionExpression' && callback.body.type === 'BinaryExpression') {
				return;
			}

			if ((callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression')
				&& callback.body.type === 'BlockStatement'
				&& callback.body.body.length === 1
				&& callback.body.body[0].type === 'ReturnStatement'
				&& callback.body.body[0].argument.type === 'BinaryExpression') {
				return;
			}

			return problem;
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `Array#reduce()` and `Array#reduceRight()`.',
		},
		schema,
		messages,
	},
};
