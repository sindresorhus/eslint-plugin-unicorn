'use strict';
const methodSelector = require('./utils/method-selector');
const getDocumentationUrl = require('./utils/get-documentation-url');
const {notFunctionSelector} = require('./utils/not-function');

const MESSAGE_ID_REDUCE = 'reduce';
const MESSAGE_ID_REDUCE_RIGHT = 'reduceRight';
const messages = {
	[MESSAGE_ID_REDUCE]: '`Array#reduce()` is not allowed',
	[MESSAGE_ID_REDUCE_RIGHT]: '`Array#reduceRight()` is not allowed'
};

const prototypeSelector = method => [
	methodSelector({name: method}),
	'[callee.object.type="MemberExpression"]',
	'[callee.object.computed=false]',
	`:matches(${
		['reduce', 'reduceRight'].map(method => `[callee.object.property.name="${method}"]`).join(', ')
	})`,
	'[callee.object.property.type="Identifier"]',
	`:matches(${
		[
			// `[].reduce`
			[
				'type="ArrayExpression"',
				'elements.length=0'
			],
			// `Array.prototype.reduce`
			[
				'type="MemberExpression"',
				'computed=false',
				'property.type="Identifier"',
				'property.name="prototype"',
				'object.type="Identifier"',
				'object.name="Array"'
			]
		].map(
			selectors => selectors
				.map(selector => `[callee.object.object.${selector}]`)
				.join('')
		).join(', ')
	})`
].join('');

const PROTOTYPE_CALL_SELECTOR = [
	prototypeSelector('call'),
	notFunctionSelector('arguments.1')
].join('');

const PROTOTYPE_APPLY_SELECTOR = prototypeSelector('apply');

const METHOD_SELECTOR = [
	methodSelector({names: ['reduce', 'reduceRight'], min: 1, max: 2}),
	notFunctionSelector('arguments.0')
].join('');

const create = context => {
	return {
		[METHOD_SELECTOR](node) {
			// For arr.reduce()
			context.report({node: node.callee.property, messageId: node.callee.property.name});
		},
		[PROTOTYPE_CALL_SELECTOR](node) {
			// For cases [].reduce.call() and Array.prototype.reduce.call()
			context.report({node: node.callee.object.property, messageId: node.callee.object.property.name});
		},
		[PROTOTYPE_APPLY_SELECTOR](node) {
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
		messages,
		schema: []
	}
};
