'use strict';
const methodSelector = require('./utils/method-selector');
const getDocumentationUrl = require('./utils/get-documentation-url');

const messageId = 'no-reduce';

const PROTOTYPE_SELECTOR = [
	methodSelector({names: ['call', 'apply']}),
	'[callee.object.type="MemberExpression"]',
	'[callee.object.computed=false]',
	'[callee.object.property.name="reduce"]',
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

const METHOD_SELECTOR = [
	methodSelector({name: 'reduce', min: 1, max: 2}),
	'[callee.object.property.name!="call"]'
].join('');

const create = context => {
	return {
		[METHOD_SELECTOR](node) {
			// For arr.reduce()
			context.report({node: node.callee.property, messageId});
		},
		[PROTOTYPE_SELECTOR](node) {
			// For cases [].reduce.call() and Array.prototype.reduce.call()
			context.report({node: node.callee.object.property, messageId});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages: {
			[messageId]: '`Array#reduce()` not allowed'
		}
	}
};
