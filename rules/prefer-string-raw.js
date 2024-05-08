'use strict';
const {isStringLiteral, isDirective} = require('./ast/index.js');
const {} = require('./fix/index.js');
const {} = require('./utils/index.js');


const MESSAGE_ID= 'prefer-string-raw';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{value}}`.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Literal', node => {
		if (
			!isStringLiteral(node)
			|| isDirective(node.parent)
			|| (node.parent.type === 'ImportDeclaration' || node.parent.type === 'ExportNamedDeclaration') && node.parent.source === node
		) {
			return;
		}

		const raw = node;
	});

	return {
		[selector](node) {
			return {
				node,
				messageId: MESSAGE_ID,
				data: {
					value: 'unicorn',
					replacement: '🦄',
				},

				/** @param {import('eslint').Rule.RuleFixer} fixer */
				fix: fixer => fixer.replaceText(node, '\'🦄\''),


			};
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String.raw` tag to avoid escape `\\`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};
