'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const message = 'Zero fraction or dangling dot in number.';

const regexpEndsWithZeroFraction = /\.0*$/;
const create = context => {
	return {
		Literal: node => {
			if (typeof node.value === 'number' && node.value % 1 === 0 && regexpEndsWithZeroFraction.test(node.raw)) {
				context.report({
					node,
					message,
					fix: fixer => fixer.replaceText(node, `${node.value}`)
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
