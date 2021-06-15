'use strict';
const builtins = require('./utils/builtins.js');
const isShadowed = require('./utils/is-shadowed.js');
const {callExpressionSelector, newExpressionSelector} = require('./selectors/index.js');
const {switchNewExpressionToCallExpression} = require('./fix/index.js');

const messages = {
	enforce: 'Use `new {{name}}()` instead of `{{name}}()`.',
	disallow: 'Use `{{name}}()` instead of `new {{name}}()`.'
};

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[callExpressionSelector(builtins.enforceNew)]: node => {
			const {callee, parent} = node;
			if (isShadowed(context.getScope(), callee)) {
				return;
			}

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

			return {
				node,
				messageId: 'enforce',
				data: {name},
				fix: fixer => fixer.insertTextBefore(node, 'new ')
			};
		},
		[newExpressionSelector(builtins.disallowNew)]: node => {
			const {callee} = node;

			if (isShadowed(context.getScope(), callee)) {
				return;
			}

			const {name} = callee;
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

			return problem;
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce the use of `new` for all builtins, except `String`, `Number`, `Boolean`, `Symbol` and `BigInt`.'
		},
		fixable: 'code',
		messages
	}
};
