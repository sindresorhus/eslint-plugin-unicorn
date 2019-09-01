'use strict';
module.exports = {
	parser: 'babel-eslint',
	parserOptions: {
		ecmaFeatures: {
			jsx: true
		}
	},
	plugins: [
		'unicorn'
	],
	extends: 'plugin:unicorn/recommended'
};
