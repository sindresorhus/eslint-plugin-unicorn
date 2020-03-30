'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const selector = [
	'ThrowStatement',
	'>',
	'CallExpression',
	'[callee.type="Identifier"]'
].join('');
const customError = /^(?:[A-Z][\da-z]*)*Error$/;
const message = 'Use `new` when throwing an error.';

const create = context => ({
	[selector]: node => {
		if (customError.test(node.callee.name)) {
			context.report({
				node,
				message,
				fix: fixer => fixer.insertTextBefore(node, 'new ')
			});
		}
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
