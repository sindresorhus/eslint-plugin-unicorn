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
				ecmaVersion: 2017,
				sourceType: 'module'
			},
			rules: {
				'unicorn/catch-error-name': ['error', {name: 'err'}],
				'unicorn/explicit-length-check': 'error',
				'unicorn/filename-case': ['error', {case: 'kebabCase'}],
				'unicorn/no-abusive-eslint-disable': 'error',
				'unicorn/no-process-exit': 'error',
				'unicorn/throw-new-error': 'error',
				'unicorn/number-literal-case': 'error',
				'unicorn/escape-case': 'off',
				'unicorn/no-array-instanceof': 'error',
				'unicorn/no-new-buffer': 'error',
				'unicorn/no-hex-escape': 'off',
				'unicorn/custom-error-definition': 'error',
				'unicorn/prefer-starts-ends-with': 'error',
				'unicorn/prefer-type-error': 'error'
			}
		}
	}
};
