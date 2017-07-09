'use strict';
const create = context => {
	return {
		'CallExpression[callee.name="RegExp"]': node => {
			context.report({
				node,
				message: 'Use `new RegExp()` instead of `RegExp()`',
				fix: fixer => fixer.insertTextBefore(node, 'new ')
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		fixable: 'code'
	}
};
