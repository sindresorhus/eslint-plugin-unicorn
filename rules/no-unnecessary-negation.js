'use strict';
const {} = require('./selectors/index.js');
const {} = require('./fix/index.js');


const MESSAGE_ID= 'no-unnecessary-negation';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{value}}`.',
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
		type: 'problem',
		docs: {
			description: 'This rule checks if conditions can be simpified.',
		},
		fixable: 'code',
		
		messages,
	},
};
