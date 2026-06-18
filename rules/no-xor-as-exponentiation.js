import {isDecimalIntegerNode} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-xor-as-exponentiation/error';
const MESSAGE_ID_SUGGESTION = 'no-xor-as-exponentiation/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Unexpected bitwise XOR operator `^`. Did you mean the exponentiation operator `**`?',
	[MESSAGE_ID_SUGGESTION]: 'Replace `^` with `**`.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('BinaryExpression', node => {
		const {left, operator, right} = node;

		if (
			operator !== '^'
			|| !isDecimalIntegerNode(left)
			|| !isDecimalIntegerNode(right)
		) {
			return;
		}

		const {sourceCode} = context;
		const operatorToken = sourceCode.getTokenAfter(
			left,
			token => token.type === 'Punctuator' && token.value === '^',
		);

		return {
			node: operatorToken,
			messageId: MESSAGE_ID_ERROR,
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: fixer => fixer.replaceText(operatorToken, '**'),
				},
			],
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow the bitwise XOR operator where exponentiation was likely intended.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
