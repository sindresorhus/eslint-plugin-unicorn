'use strict';
const getDocumentsUrl = require('./utils/get-documents-url');

const create = context => ({
	BinaryExpression: node => {
		if (node.operator === 'instanceof' && node.right.type === 'Identifier' && node.right.name === 'Array') {
			// Get the source code and extract the left part
			const arraySourceCode = context.getSourceCode().text.slice(node.left.range[0], node.left.range[1]);

			context.report({
				node,
				message: 'Use `Array.isArray()` instead of `instanceof Array`.',
				fix: fixer => fixer.replaceText(node, `Array.isArray(${arraySourceCode})`)
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
