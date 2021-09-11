'use strict';
const unicorn = require('eslint-plugin-unicorn');

module.exports = {
	root: true,
	parser: '@babel/eslint-parser',
	parserOptions: {
		ecmaVersion: 2021,
		ecmaFeatures: {
			jsx: true,
		},
		requireConfigFile: false,
		babelOptions: {
			babelrc: false,
			configFile: false,
			parserOpts: {
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
	extends: 'plugin:unicorn/all',
	rules: {
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
