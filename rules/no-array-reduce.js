'use strict';
const {methodCallSelector} = require('./selectors');
const getDocumentationUrl = require('./utils/get-documentation-url');
const {arrayPrototypeMethodSelector, notFunctionSelector} = require('./selectors');

const MESSAGE_ID_REDUCE = 'reduce';
const MESSAGE_ID_REDUCE_RIGHT = 'reduceRight';
const messages = {
	[MESSAGE_ID_REDUCE]: '`Array#reduce()` is not allowed',
	[MESSAGE_ID_REDUCE_RIGHT]: '`Array#reduceRight()` is not allowed'
};

const prototypeSelector = method => [
	methodCallSelector(method),
	arrayPrototypeMethodSelector({
		path: 'callee.object',
		names: ['reduce', 'reduceRight']
	})
].join('');

// `array.{reduce,reduceRight}()`
const arrayReduce = [
	methodCallSelector({names: ['reduce', 'reduceRight'], min: 1, max: 2}),
	notFunctionSelector('arguments.0')
].join('');
// `[].{reduce,reduceRight}.call()` and `Array.{reduce,reduceRight}.call()`
const arrayPrototypeReduceCall = [
	prototypeSelector('call'),
	notFunctionSelector('arguments.1')
].join('');
// `[].{reduce,reduceRight}.apply()` and `Array.{reduce,reduceRight}.apply()`
const arrayPrototypeReduceApply = prototypeSelector('apply');

const create = context => {
	return {
		[arrayReduce](node) {
			// For arr.reduce()
			context.report({node: node.callee.property, messageId: node.callee.property.name});
		},
		[arrayPrototypeReduceCall](node) {
			// For cases [].reduce.call() and Array.prototype.reduce.call()
			context.report({node: node.callee.object.property, messageId: node.callee.object.property.name});
		},
		[arrayPrototypeReduceApply](node) {
			// For cases [].reduce.apply() and Array.prototype.reduce.apply()
			context.report({node: node.callee.object.property, messageId: node.callee.object.property.name});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `Array#reduce()` and `Array#reduceRight()`.',
			url: getDocumentationUrl(__filename)
		},
		schema: [],
		messages
	}
};
