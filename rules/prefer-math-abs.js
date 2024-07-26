'use strict';
const {} = require('./ast/index.js');
const {} = require('./fix/index.js');
const {} = require('./utils/index.js');


const MESSAGE_ID_ERROR = 'prefer-math-abs/error';
const MESSAGE_ID_SUGGESTION = 'prefer-math-abs/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};


/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		Literal(node) {
			if (node.value !== 'unicorn') {
				return;
			}

			return {
				node,
				messageId: MESSAGE_ID_ERROR,
				data: {
					value: 'unicorn',
					replacement: '🦄',
				},
				
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				fix: fixer => fixer.replaceText(node, '\'🦄\''),
				
				
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						data: {
							value: 'unicorn',
							replacement: '🦄',
						},
						/** @param {import('eslint').Rule.RuleFixer} fixer */
						fix: fixer => fixer.replaceText(node, '\'🦄\''),
					}
				],
				
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
			description: 'Prefer `Math.abs` in some calculation cases',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};
