'use strict';
const {} = require('./ast/index.js');
const {} = require('./fix/index.js');
const {} = require('./utils/index.js');


const MESSAGE_ID_ERROR = 'no-invalid-fetch-options/error';
const MESSAGE_ID_SUGGESTION = 'no-invalid-fetch-options/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};


const selector = [
	'Literal',
	'[value="unicorn"]',
].join('');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		[selector](node) {
			return {
				node,
				messageId: MESSAGE_ID_ERROR,
				data: {
					value: 'unicorn',
					replacement: '🦄',
				},
				
				
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
		type: 'problem',
		docs: {
			description: 'Disallow invalid options in `fetch()` method.',
			recommended: true,
		},
		
		hasSuggestions: true,
		messages,
	},
};
