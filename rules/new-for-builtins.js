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
			const {callee, parent} = node;
			const {name} = callee;

			if (
				name === 'Object' &&
				parent &&
				parent.type === 'BinaryExpression' &&
				(parent.operator === '===' || parent.operator === '!==') &&
				(parent.left === node || parent.right === node)
			) {
				return;
			}

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
			const {callee, range} = node;
			const {name, range: calleeRange} = callee;

			if (disallowNew.has(name) && !isShadowed(context.getScope(), callee)) {
				const problem = {
					node,
					messageId: 'disallow',
					data: {name}
				};

				if (name !== 'String' && name !== 'Boolean' && name !== 'Number') {
					problem.fix = fixer => fixer.removeRange([
						range[0],
						calleeRange[0]
					]);
				}

				context.report(problem);
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
