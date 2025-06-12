import {} from './ast/index.js';
import {} from './fix/index.js';
import {} from './utils/index.js';


const MESSAGE_ID_ERROR = 'no-error-capture-stack-trace/error';
const MESSAGE_ID_SUGGESTION = 'no-error-capture-stack-trace/suggestion';
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
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary `Error.captureStackTrace(…)`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
