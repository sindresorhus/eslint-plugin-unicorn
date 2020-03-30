'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const selector = [
	'ThrowStatement',
	'[argument.type="CallExpression"]',
	'[argument.callee.type="Identifier"]'
].join('');
const customError = /^(?:[A-Z][\da-z]*)*Error$/;
const message = 'Use `new` when throwing an error.';

const create = context => ({
	[selector]: ({argument: error}) => {
		const errorConstructor = error.callee;

		if (customError.test(errorConstructor.name)) {
			context.report({
				node: error,
				message,
				fix: fixer => fixer.insertTextBefore(errorConstructor, 'new ')
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
