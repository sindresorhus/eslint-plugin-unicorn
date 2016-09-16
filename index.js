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
				'xo/catch-error-name': ['error', {name: 'err'}],
				'xo/explicit-length-check': 'error',
				'xo/filename-case': ['error', {case: 'kebabCase'}],
				'xo/no-abusive-eslint-disable': 'error',
				'xo/no-process-exit': 'error',
				'xo/throw-new-error': 'error'
			}
		}
	}
};
