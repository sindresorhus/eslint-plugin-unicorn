'use strict';
module.exports = {
	env: {
		node: true
	},
	extends: ['eslint:recommended', 'plugin:unicorn/recommended'],
	rules: {
		semi: ['error'],
		indent: ['error', 'tab', {
			'SwitchCase': 1
		}],
		// Override eslint:recommended which lacks the option
		'no-empty': ['error', {allowEmptyCatch: true}]
	}
};
