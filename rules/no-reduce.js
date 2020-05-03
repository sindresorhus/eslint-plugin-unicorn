'use strict';
const methodSelector = require('./utils/method-selector');
const getDocumentationUrl = require('./utils/get-documentation-url');

const message = 'Array.reduce not allowed';

const PROTOTYPE_SELECTOR = [
	methodSelector({name: 'call'}),
	'[callee.object.type="MemberExpression"]',
	'[callee.object.property.type="Identifier"]',
	'[callee.object.property.name="reduce"]'
].join('');

const create = context => {
	return {
		[methodSelector({name: 'reduce'})](node) {
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
