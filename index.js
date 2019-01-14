'use strict';
const path = require('path');
const importModules = require('import-modules');

module.exports = {
	rules: importModules(path.resolve(__dirname, 'rules'), {camelize: false}),
	configs: {
		recommended: {
			env: {
				es6: true
			},
			parserOptions: {
				ecmaVersion: 2019,
				sourceType: 'module'
			},
			plugins: [
				'unicorn'
			],
			rules: {
				'unicorn/catch-error-name': [
					'error',
					{
						name: 'error'
					}
				],
				'unicorn/explicit-length-check': 'error',
				'unicorn/filename-case': [
					'error',
					{
						case: 'kebabCase'
					}
				],
				'unicorn/no-abusive-eslint-disable': 'error',
				'unicorn/no-process-exit': 'error',
				'unicorn/throw-new-error': 'error',
				'unicorn/number-literal-case': 'error',
				'unicorn/escape-case': 'error',
				'unicorn/no-array-instanceof': 'error',
				'unicorn/no-new-buffer': 'error',
				'unicorn/no-hex-escape': 'error',
				'unicorn/custom-error-definition': 'off',
				'unicorn/prefer-starts-ends-with': 'error',
				'unicorn/prefer-type-error': 'error',
				'unicorn/no-fn-reference-in-iterator': 'off',
				'unicorn/import-index': 'error',
				'unicorn/new-for-builtins': 'error',
				'unicorn/regex-shorthand': 'error',
				'unicorn/prefer-spread': 'error',
				'unicorn/error-message': 'error',
				'unicorn/no-unsafe-regex': 'off',
				'unicorn/prefer-add-event-listener': 'error',
				'unicorn/prefer-exponentiation-operator': 'error',
				'unicorn/no-console-spaces': 'error',
				'unicorn/no-unreadable-array-destructuring': 'error',
				'unicorn/no-unused-properties': 'off',
				'unicorn/prefer-node-append': 'error',
				'unicorn/prefer-query-selector': 'error'
			}
		}
	}
};
