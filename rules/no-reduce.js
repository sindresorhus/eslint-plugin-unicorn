'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const message = 'Array.reduce not allowed';

const create = context => {
	return {
		'CallExpression > MemberExpression[property.name="reduce"]'(node) {
			// For arr.reduce()
			context.report({node: node.property, message});
		},
		'CallExpression > MemberExpression[property.name="call"] > MemberExpression[property.name="reduce"]'(node) {
			// For cases [].reduce.call() and Array.prototype.reduce.call()
			context.report({node: node.property, message});
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
