'use strict';

module.exports = {
	rules: {
		'throw-new-error': require('./rules/throw-new-error')
	},
	configs: {
		recommended: {
			env: {
				es6: true
			},
			parserOptions: {
				ecmaVersion: 7,
				sourceType: 'module'
			},
			rules: {
				'xo/throw-new-error': 'error'
			}
		}
	}
};
