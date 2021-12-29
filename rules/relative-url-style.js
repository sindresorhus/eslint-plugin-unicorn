'use strict';
const {newExpressionSelector} = require('./selectors/index.js');
const {replaceStringLiteral} = require('./fix/index.js');

const MESSAGE_ID_NEVER = 'never';
const MESSAGE_ID_ALWAYS = 'always';
const messages = {
	[MESSAGE_ID_NEVER]: 'Remove `./` prefix from relative urls.',
	[MESSAGE_ID_ALWAYS]: 'Use `./` prefix in relative urls.',
};

const selector = [
	newExpressionSelector({name: 'URL', argumentsLength: 2}),
	' > Literal:first-child.arguments'
].join('');

const TEST_URL_BASE = 'https://www.example.com/'
const isSafeToAddDotSlash = url => new URL(url, TEST_URL_BASE).href === new URL(`./${url}`, TEST_URL_BASE).href;

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {
		style
	} = {
		style: 'never',
		...context.options[0]
	};

	const shouldRemoveDotSlash = style === 'never';

	return {
		[selector](node) {
			const {value} = node;
			if (typeof value !== 'string') {
				return;
			}

			if (shouldRemoveDotSlash) {
				if (!value.startsWith('./')) {
					return;
				}

				return {
					node,
					messageId: MESSAGE_ID_NEVER,
					/** @param {import('eslint').Rule.RuleFixer} fixer */
					fix: fixer => replaceStringLiteral(fixer, node, '', 0, 2),
				};
			}

			if (
				value.startsWith('.')
				|| value.startsWith('/')
				|| !isSafeToAddDotSlash(value)
			) {
				return;
			}

			return {
				node,
				messageId: MESSAGE_ID_ALWAYS,
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				fix: fixer => replaceStringLiteral(fixer, node, './', 0, 0),
			};
		}
	}
};

const schema = [
	{
		enum: ['never', 'always'],
		default: 'never',
	},
];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent relative url style.'
		},
		fixable: 'code',
		schema,
		messages
	}
};
