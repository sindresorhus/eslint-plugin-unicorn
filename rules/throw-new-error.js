'use strict';

const errorTypes = [
	'Error',
	'EvalError',
	'RangeError',
	'ReferenceError',
	'SyntaxError',
	'TypeError',
	'URIError'
];

const create = context => ({
	ThrowStatement: node => {
		const arg = node.argument;
		const error = arg.callee;

		if (arg.type === 'CallExpression' && errorTypes.indexOf(error.name) !== -1) {
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
