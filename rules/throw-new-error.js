'use strict';
const getDocumentsUrl = require('./utils/get-documents-url');

const customError = /^(?:[A-Z][a-z\d]*)*Error$/;

const create = context => ({
	ThrowStatement: node => {
		const {argument} = node;
		const error = argument.callee;

		if (argument.type === 'CallExpression' && customError.test(error.name)) {
			context.report({
				node,
				message: 'Use `new` when throwing an error.',
				fix: fixer => fixer.insertTextBefore(error, 'new ')
			});
		}
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentsUrl(__filename)
		},
		fixable: 'code'
	}
};
