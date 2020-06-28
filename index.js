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
				ecmaVersion: 2020,
				sourceType: 'module'
			},
			plugins: [
				'unicorn'
			],
			rules: {
				'unicorn/better-regex': 'error',
				'unicorn/catch-error-name': 'error',
				'unicorn/consistent-function-scoping': 'error',
				'unicorn/custom-error-definition': 'off',
				'unicorn/error-message': 'error',
				'unicorn/escape-case': 'error',
				'unicorn/expiring-todo-comments': 'error',
				'unicorn/explicit-length-check': 'error',
				'unicorn/filename-case': 'error',
				'unicorn/import-index': 'error',
				'unicorn/new-for-builtins': 'error',
				'unicorn/no-abusive-eslint-disable': 'error',
				'unicorn/no-array-instanceof': 'error',
				'unicorn/no-console-spaces': 'error',
				'unicorn/no-fn-reference-in-iterator': 'error',
				'unicorn/no-for-loop': 'error',
				'unicorn/no-hex-escape': 'error',
				'unicorn/no-keyword-prefix': 'off',
				'no-nested-ternary': 'off',
				'unicorn/no-nested-ternary': 'error',
				'unicorn/no-new-buffer': 'error',
				'unicorn/no-null': 'error',
				'unicorn/no-object-as-default-parameter': 'error',
				'unicorn/no-process-exit': 'error',
				'unicorn/no-reduce': 'error',
				'unicorn/no-unreadable-array-destructuring': 'error',
				'unicorn/no-unsafe-regex': 'off',
				'unicorn/no-unused-properties': 'off',
				'unicorn/no-useless-undefined': 'error',
				'unicorn/no-zero-fractions': 'error',
				'unicorn/number-literal-case': 'error',
				'unicorn/prefer-add-event-listener': 'error',
				'unicorn/prefer-array-find': 'error',
				'unicorn/prefer-dataset': 'error',
				'unicorn/prefer-event-key': 'error',
				// TODO: Enable this by default when targeting Node.js 12.
				'unicorn/prefer-flat-map': 'off',
				'unicorn/prefer-includes': 'error',
				'unicorn/prefer-modern-dom-apis': 'error',
				'unicorn/prefer-negative-index': 'error',
				'unicorn/prefer-node-append': 'error',
				'unicorn/prefer-node-remove': 'error',
				'unicorn/prefer-number-properties': 'error',
				'unicorn/prefer-optional-catch-binding': 'error',
				'unicorn/prefer-query-selector': 'error',
				'unicorn/prefer-reflect-apply': 'error',
				// TODO: Enable this by default when it's shipping in a Node.js LTS version.
				'unicorn/prefer-replace-all': 'off',
				'unicorn/prefer-set-has': 'error',
				'unicorn/prefer-spread': 'error',
				'unicorn/prefer-starts-ends-with': 'error',
				'unicorn/prefer-string-slice': 'error',
				'unicorn/prefer-text-content': 'error',
				'unicorn/prefer-trim-start-end': 'error',
				'unicorn/prefer-type-error': 'error',
				'unicorn/prevent-abbreviations': 'error',
				'unicorn/string-content': 'off',
				'unicorn/throw-new-error': 'error'
			}
		}
	}
};
