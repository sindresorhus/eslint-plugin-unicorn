'use strict';

const create = context => ({
	BinaryExpression: node => {
		if (node.operator === 'instanceof' && node.right.type === 'Identifier' && node.right.name === 'Array') {
			if (node.left.type === 'Identifier') {
				context.report({
					node,
					message: 'Use `Array.isArray()` instead of `instanceof Array`',
					fix: fixer => fixer.replaceText(node, 'Array.isArray(' + node.left.name + ')')
				});
			}
			if (node.left.type === 'ArrayExpression') {
				// Get the source code and exteact the array
				const arraySourceCode = context.getSourceCode().text.slice(node.left.range[0], node.left.range[1]);
				context.report({
					node,
					message: 'Use `Array.isArray()` instead of `instanceof Array`',
					fix: fixer => fixer.replaceText(node, 'Array.isArray(' + arraySourceCode + ')')
				});
			}
		}
	}
});

module.exports = {
	create,
	meta: {
		fixable: 'code'
	}
};
