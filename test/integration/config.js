'use strict';
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
	extends: 'plugin:unicorn/recommended'
};
