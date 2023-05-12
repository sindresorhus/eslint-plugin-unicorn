'use strict';
const isBuiltinModule = require('is-builtin-module');
const {replaceStringLiteral} = require('./fix/index.js');
const isStaticRequire = require('./ast/is-static-require.js');

const MESSAGE_ID = 'prefer-node-protocol';
const messages = {
	[MESSAGE_ID]: 'Prefer `node:{{moduleName}}` over `{{moduleName}}`.',
};

function getProblem(sourceNode) {
		const {value} = sourceNode;

		if (
			typeof value !== 'string'
			|| value.startsWith('node:')
			|| !isBuiltinModule(value)
		) {
			return;
		}

		return {
			node: sourceNode,
			messageId: MESSAGE_ID,
			data: {moduleName: value},
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix: fixer => replaceStringLiteral(fixer, sourceNode, 'node:', 0, 0),
		};
}


const create = () => ({
	CallExpression(node) {
		if (!isStaticRequire(node)) {
			return;
		}

		return getProblem(node.arguments[0]);
	},
	'ImportDeclaration, ExportNamedDeclaration, ImportExpression'(node) {
		return getProblem(node.source);
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
