'use strict';
const path = require('path');
const {matches} = require('../../rules/selectors/index.js');
const toLocation = require('../../rules/utils/to-location.js');

const messageId = path.basename(__filename, '.js');

const selector = [
	matches([
		// `const messages = {...}`;
		[
			'VariableDeclarator',
			'[id.type="Identifier"]',
			'[id.name="messages"]',
		],
		// `{meta: {messages = {...}}}`;
		[
			'Property',
			'[key.type="Identifier"]',
			'[key.name="messages"]',
		],
	]),
	' > ',
	'ObjectExpression.init',
	' > ',
	'Property.properties',
	' > ',
	'Literal.value',
].join('');

const words = [
	{word: 'forbid', replacement: 'disallow'},
	{word: 'forbidden', replacement: 'disallowed'},
];

module.exports = {
	create(context) {
		return {
			[selector](node) {
				const {value} = node;
				if (typeof value !== 'string') {
					return;
				}

				const message = node.raw.slice(1, -1);
				const lowerCased = message.toLowerCase();

				for (const {word, replacement} of words) {
					const index = lowerCased.indexOf(word);

					if (index === -1) {
						continue;
					}

					const range = [index, index + word.length];
					const original = message.slice(...range);
					const isUpperCased = /^[A-Z]/.test(original);

					context.report({
						node,
						loc: toLocation(range, context.getSourceCode()),
						messageId,
						data: {
							original,
							replacement: isUpperCased ? replacement[0].toUpperCase() + replacement.slice(1) : replacement,
						},
					});

					// Only report one problem
					return;
				}
			},
		};
	},
	meta: {
		messages: {
			[messageId]: 'Prefer use `{{replacement}}` over `{{original}}` in error message.',
		},
	},
};
