'use strict';
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

const create = () => {
	return {
		[selector](node) {
			return {
				node,
				messageId: MESSAGE_ID,
				data: {method: node.name},
			};
		},
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `Array#reduce()` and `Array#reduceRight()`.',
		},
		messages,
	},
};
