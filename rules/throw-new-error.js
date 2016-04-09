'use strict';

var errorTypes = [
	'Error',
	'EvalError',
	'RangeError',
	'ReferenceError',
	'SyntaxError',
	'TypeError',
	'URIError'
];

module.exports = function (context) {
	return {
		ThrowStatement: function (node) {
			var arg = node.argument;
			var error = arg.callee;

			if (arg.type === 'CallExpression' && errorTypes.indexOf(error.name) !== -1) {
				context.report({
					node: node,
					message: 'Use `new` when throwing an error.',
					fix: function (fixer) {
						return fixer.insertTextBefore(error, 'new ');
					}
				});
			}
		}
	};
};
