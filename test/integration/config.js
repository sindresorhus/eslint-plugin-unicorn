'use strict';
const unicorn = require('eslint-plugin-unicorn');

const enableAllRules = Object.fromEntries(
	Object.entries(unicorn.configs.recommended.rules)
		.filter(([id, options]) => id.startsWith('unicorn/') && options === 'off')
		.map(([id]) => [id, 'error'])
);

module.exports = {
	root: true,
	parser: 'babel-eslint',
	parserOptions: {
		ecmaVersion: 2020,
		ecmaFeatures: {
			jsx: true
		}
	},
	plugins: [
		'unicorn'
	],
	extends: 'plugin:unicorn/recommended',
	rules: {
		...enableAllRules,

		// This rule crashing on replace string inside `jsx` or `Unicode escape sequence`
		'unicorn/string-content': 'off'
	}
};
