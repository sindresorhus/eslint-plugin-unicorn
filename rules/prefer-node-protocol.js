'use strict';
const isBuiltinModule = require('is-builtin-module');
const {replaceStringLiteral} = require('./fix/index.js');
const isStaticRequire = require('./ast/is-static-require.js');

const MESSAGE_ID = 'prefer-node-protocol';
const messages = {
	[MESSAGE_ID]: 'Prefer `node:{{moduleName}}` over `{{moduleName}}`.',
};

const create = () => ({
	Literal(node) {
		if (!(
			(
				(
					node.parent.type === 'ImportDeclaration'
					|| node.parent.type === 'ExportNamedDeclaration'
					|| node.parent.type === 'ImportExpression'
				)
				&& node.parent.source === node
			)
			|| (
				isStaticRequire(node.parent)
				&& node.parent.arguments[0] === node
			)
		)) {
			return;
		}

		const {value} = node;

		if (
			typeof value !== 'string'
			|| value.startsWith('node:')
			|| !isBuiltinModule(value)
		) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			data: {moduleName: value},
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix: fixer => replaceStringLiteral(fixer, node, 'node:', 0, 0),
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using the `node:` protocol when importing Node.js builtin modules.',
		},
		fixable: 'code',
		messages,
	},
};
