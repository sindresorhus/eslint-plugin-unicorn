'use strict';
const unicorn = require('eslint-plugin-unicorn');

const enableAllRules = Object.fromEntries(
	Object.entries(unicorn.configs.recommended.rules)
		.filter(([id]) => id.startsWith('unicorn/'))
		.map(([id]) => [id, 'error']),
);

module.exports = {
	root: true,
	parser: '@babel/eslint-parser',
	parserOptions: {
		ecmaVersion: 'latest',
		ecmaFeatures: {
			jsx: true,
		},
		requireConfigFile: false,
		babelOptions: {
			babelrc: false,
			configFile: false,
			parserOpts: {
				allowAwaitOutsideFunction: true,
				plugins: [
					'jsx',
					'doExpressions',
					'exportDefaultFrom',
				],
			},
		},
	},
	plugins: [
		'unicorn',
	],
	extends: 'plugin:unicorn/recommended',
	rules: {
		...enableAllRules,

		// This rule crashing on replace string inside `jsx` or `Unicode escape sequence`
		'unicorn/string-content': 'off',
	},
	overrides: [
		{
			files: ['*.ts'],
			parser: '@typescript-eslint/parser',
		},
		{
			files: ['*.vue'],
			parser: 'vue-eslint-parser',
		},
	],
};
