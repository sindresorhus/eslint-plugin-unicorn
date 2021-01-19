'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const builtins = require('./utils/builtins');
const isShadowed = require('./utils/is-shadowed');
const switchNewExpressionToCallExpression = require('./utils/switch-new-expression-to-call-expression');

const messages = {
	enforce: 'Use `new {{name}}()` instead of `{{name}}()`.',
	disallow: 'Use `{{name}}()` instead of `new {{name}}()`.'
};

const enforceNew = new Set(builtins.enforceNew);
const disallowNew = new Set(builtins.disallowNew);

const create = context => {
	const sourceCode = context.getSourceCode();

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
			const {callee} = node;
			const {name} = callee;

			if (disallowNew.has(name) && !isShadowed(context.getScope(), callee)) {
				const problem = {
					node,
					messageId: 'disallow',
					data: {name}
				};

				if (name !== 'String' && name !== 'Boolean' && name !== 'Number') {
					problem.fix = function * (fixer) {
						yield * switchNewExpressionToCallExpression(node, sourceCode, fixer);
					};
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
