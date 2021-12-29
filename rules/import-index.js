'use strict';
const {STATIC_REQUIRE_SELECTOR} = require('./selectors/index.js');

const MESSAGE_ID = 'import-index';
const messages = {
	[MESSAGE_ID]: 'Do not reference the index file directly..',
};

const regexp = /^(?<package>@.*?\/.*?|[./]+?.*?)\/(?:\.|(?:index(?:\.js)?))?$/;
const isImportingIndex = value => regexp.test(value);
const normalize = value => value.replace(regexp, '$<package>');

const importIndex = (context, node, argument) => {
	if (argument && isImportingIndex(argument.value)) {
		return {
			node,
			messageId: MESSAGE_ID,
			fix: fixer => fixer.replaceText(argument, `'${normalize(argument.value)}'`),
		};
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const options = context.options[0] || {};

	const rules = {
		[STATIC_REQUIRE_SELECTOR]: node => importIndex(context, node, node.arguments[0]),
	};

	if (!options.ignoreImports) {
		rules.ImportDeclaration = node => importIndex(context, node, node.source);
	}

	return rules;
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			ignoreImports: {
				type: 'boolean',
				default: false,
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce importing index files with `.`.',
		},
		fixable: 'code',
		schema,
		messages,
	},
};
