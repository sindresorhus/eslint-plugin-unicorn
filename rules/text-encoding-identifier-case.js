'use strict';
const {replaceStringLiteral} = require('./fix/index.js');

const MESSAGE_ID_ERROR = 'text-encoding-identifier/error';
const MESSAGE_ID_SUGGESTION = 'text-encoding-identifier/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

const getReplacement = encoding => {
	switch (encoding.toLowerCase()) {
		case 'utf8':
		case 'utf-8':
			return 'utf8';
		case 'ascii':
			return 'ascii';
		// No default
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	Literal(node) {
		if (typeof node.value !== 'string') {
			return;
		}

		const {raw} = node;
		const value = raw.slice(1, -1);

		const replacement = getReplacement(value);
		if (!replacement || replacement === value) {
			return;
		}

		const messageData = {
			value,
			replacement,
		};

		return {
			node,
			messageId: MESSAGE_ID_ERROR,
			data: messageData,
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data: messageData,
					/** @param {import('eslint').Rule.RuleFixer} fixer */
					fix: fixer => replaceStringLiteral(fixer, node, replacement),
				},
			],
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent case for text encoding identifiers.',
		},
		hasSuggestions: true,
		messages,
	},
};
