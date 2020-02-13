'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const builtins = require('./utils/builtins');
const isShadowed = require('./utils/is-shadowed');

const messages = {
	enforce: 'Use `new {{name}}()` instead of `{{name}}()`.',
	disallow: 'Use `{{name}}()` instead of `new {{name}}()`.'
};

const enforceNew = new Set(builtins.enforceNew);
const disallowNew = new Set(builtins.disallowNew);

const create = context => {
	return {
		CallExpression: node => {
			const {callee} = node;
			const {name} = callee;

			if (enforceNew.has(name) && !isShadowed(context.getScope(), callee)) {
				context.report({
					node,
					messageId: 'enforce',
					data: {name},
					fix: fixer => fixer.insertTextBefore(node, 'new ')
				});
			}
		},
		NewExpression: node => {
			const {callee} = node;
			const {name} = callee;

			if (disallowNew.has(name) && !isShadowed(context.getScope(), callee)) {
				context.report({
					node,
					messageId: 'disallow',
					data: {name},
					fix: fixer => fixer.removeRange([
						node.range[0],
						node.callee.range[0]
					])
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
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
