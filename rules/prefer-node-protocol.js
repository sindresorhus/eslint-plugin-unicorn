'use strict';
const isBuiltinModule = require('is-builtin-module');
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'prefer-node-protocol';
const messages = {
	[MESSAGE_ID]: 'Prefer `node:{{moduleName}}` over `{{moduleName}}`.'
};

const importExportSelector = [
	':matches(ImportDeclaration, ExportNamedDeclaration, ImportExpression)',
	' > ',
	'Literal.source'
].join('');

const requireSelector = [
	'CallExpression',
	'[optional!=true]',
	'[callee.type="Identifier"]',
	'[callee.name="require"]',
	'[arguments.length=1]',
	' > ',
	'Literal.arguments'
].join('');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {checkRequire} = {
		checkRequire: false,
		...context.options[0]
	};
	const selector = checkRequire ?
		`:matches(${importExportSelector}, ${requireSelector})` :
		importExportSelector;

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

const schema = [
	{
		type: 'object',
		properties: {
			checkRequire: {
				type: 'boolean',
				default: false
			}
		},
		additionalProperties: false
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using the `node:` protocol when importing Node.js builtin modules.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
