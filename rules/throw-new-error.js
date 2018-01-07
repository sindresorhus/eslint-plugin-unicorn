'use strict';

const customError = /^(?:[A-Z][a-z0-9]*)*Error$/;

const create = context => ({
	ThrowStatement: node => {
		const arg = node.argument;
		const error = arg.callee;

		if (arg.type === 'CallExpression' && customError.test(error.name)) {
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
		fixable: 'code'
	}
};
