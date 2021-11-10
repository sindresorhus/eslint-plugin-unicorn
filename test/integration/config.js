'use strict';

module.exports = {
	root: true,
	parser: '@babel/eslint-parser',
	parserOptions: {
		requireConfigFile: false,
		ecmaFeatures: {
			globalReturn: true,
		},
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
