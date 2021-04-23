'use strict';
const isBuiltinModule = require('is-builtin-module');
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'prefer-node-protocol';
const messages = {
	[MESSAGE_ID]: 'Prefer `node:{{moduleName}}` over `{{moduleName}}`.'
};

const selector = [
	':matches(ImportDeclaration, ExportNamedDeclaration, ImportExpression)',
	' > ',
	'Literal.source'
].join('');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		[selector](node) {
			const {value} = node;
			if (
				typeof value !== 'string' ||
				value.startsWith('node:') ||
				!isBuiltinModule(value)
			) {
				return;
			}

			const firstCharacterIndex = node.range[0] + 1;
			context.report({
				node,
				messageId: MESSAGE_ID,
				data: {moduleName: value},
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				fix: fixer => fixer.insertTextBeforeRange([firstCharacterIndex, firstCharacterIndex], 'node:')
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using the `node:` protocol when importing Node.js builtin modules.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema: [],
		messages
	}
};
