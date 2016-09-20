'use strict';
const reqAll = require('req-all');

module.exports = {
	rules: reqAll('rules', {camelize: false}),
	configs: {
		recommended: {
			env: {
				es6: true
			},
			parserOptions: {
				ecmaVersion: 2016,
				sourceType: 'module'
			},
			rules: {
				'unicorn/catch-error-name': ['error', {name: 'err'}],
				'unicorn/explicit-length-check': 'error',
				'unicorn/filename-case': ['error', {case: 'kebabCase'}],
				'unicorn/no-abusive-eslint-disable': 'error',
				'unicorn/no-process-exit': 'error',
				'unicorn/throw-new-error': 'error'
			}
		}
	}
};
