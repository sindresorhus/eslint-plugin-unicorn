'use strict';
const methodSelector = require('./utils/method-selector');
const getDocumentationUrl = require('./utils/get-documentation-url');

const message = 'Array.reduce not allowed';

const PROTOTYPE_SELECTOR = [
	methodSelector({names: ['call', 'apply']}),
	'[callee.object.type="MemberExpression"]',
	':matches([callee.object.object.type="ArrayExpression"][callee.object.object.elements.length=0], [callee.object.object.object.type="Identifier"][callee.object.object.object.name="Array"][callee.object.object.property.name="prototype"])',
	'[callee.object.computed=false]',
	'[callee.object.property.type="Identifier"]',
	'[callee.object.property.name="reduce"]'
].join('');

const METHOD_SELECTOR = [
	methodSelector({name: 'reduce', min: 1, max: 2}),
	'[callee.object.property.name!="call"]'
].join('');

const create = context => {
	return {
		[METHOD_SELECTOR](node) {
			// For arr.reduce()
			context.report({node: node.callee.property, message});
		},
		[PROTOTYPE_SELECTOR](node) {
			// For cases [].reduce.call() and Array.prototype.reduce.call()
			context.report({node: node.callee.object.property, message});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		}
	}
};
