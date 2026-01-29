import {outdent} from 'outdent';
import indentString from 'indent-string';

const indent = (string, count) => indentString(string, count, {indent: '\t'});

const imports = outdent`
	import {} from './ast/index.js';
	import {} from './fix/index.js';
	import {} from './utils/index.js';
`;

const typeImports = outdent`
	/**
	@import {TSESTree as ESTree} from '@typescript-eslint/types';
	@import * as ESLint from 'eslint';
	*/
`;

const createMessages = data =>
	data.hasSuggestions
		? outdent`
			const MESSAGE_ID_ERROR = '${data.id}/error';
			const MESSAGE_ID_SUGGESTION = '${data.id}/suggestion';
			const messages = {
				[MESSAGE_ID_ERROR]: 'Prefer \`{{replacement}}\` over \`{{value}}\`.',
				[MESSAGE_ID_SUGGESTION]: 'Replace \`{{value}}\` with \`{{replacement}}\`.',
			};
		`
		: outdent`
			const MESSAGE_ID = '${data.id}';
			const messages = {
				[MESSAGE_ID]: 'Prefer \`{{replacement}}\` over \`{{value}}\`.',
			};
		`;

const fix = outdent`
	/** @param {ESLint.Rule.RuleFixer} fixer */
	fix: fixer => fixer.replaceText(node, '\\'🦄\\''),
`;

const suggestion = outdent`
	suggest: [
		{
			messageId: MESSAGE_ID_SUGGESTION,
			data: {
				value: 'unicorn',
				replacement: '🦄',
			},
	${indent(fix, 2)}
		},
	],
`;

const createRuleCreateFunction = data => outdent`
	/** @param {ESLint.Rule.RuleContext} context */
	const create = context => {
		context.on('Literal', node => {
			if (node.value !== 'unicorn') {
				return;
			}

			return {
				node,
				messageId: ${data.hasSuggestions ? 'MESSAGE_ID_ERROR' : 'MESSAGE_ID'},
				data: {
					value: 'unicorn',
					replacement: '🦄',
				},
	${data.fixableType ? indent(fix, 3) : ''}
	${data.hasSuggestions ? indent(suggestion, 3) : ''}
			};
		});
	};
`;

const createConfig = data => outdent`
	/** @type {ESLint.Rule.RuleModule} */
	const config = {
		create,
		meta: {
			type: '${data.type}',
			docs: {
				description: '${data.description}',
				recommended: 'unopinionated',
			},
			${data.fixableType ? `fixable: '${data.fixableType}',` : ''}
			${data.hasSuggestions ? 'hasSuggestions: true,' : ''}
			messages,
		},
	};
`;

function renderRuleTemplate(data) {
	return [
		imports,
		typeImports,
		createMessages,
		createRuleCreateFunction,
		createConfig,
		'export default config;',
	].map(part => typeof part === 'function' ? part(data) : part).join('\n\n')
	+ '\n';
}

export default renderRuleTemplate;
