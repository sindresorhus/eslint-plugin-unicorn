'use strict';
const path = require('path');
const importModules = require('import-modules');
const mapObject = require('map-obj');

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
			rules: mapObject({
				'catch-error-name': 'error',
				'consistent-function-scoping': 'error',
				'custom-error-definition': 'off',
				'error-message': 'error',
				'escape-case': 'error',
				'expiring-todo-comments': 'error',
				'explicit-length-check': 'error',
				'filename-case': 'error',
				'import-index': 'error',
				'new-for-builtins': 'error',
				'no-abusive-eslint-disable': 'error',
				'no-array-instanceof': 'error',
				'no-console-spaces': 'error',
				'no-fn-reference-in-iterator': 'off',
				'no-for-loop': 'error',
				'no-hex-escape': 'error',
				'no-keyword-prefix': 'off',
				'no-new-buffer': 'error',
				'no-process-exit': 'error',
				'no-unreadable-array-destructuring': 'error',
				'no-unsafe-regex': 'off',
				'no-unused-properties': 'off',
				'no-zero-fractions': 'error',
				'number-literal-case': 'error',
				'prefer-add-event-listener': 'error',
				'prefer-event-key': 'error',
				'prefer-exponentiation-operator': 'error',
				'prefer-flat-map': 'error',
				'prefer-includes': 'error',
				'prefer-node-append': 'error',
				'prefer-node-remove': 'error',
				'prefer-query-selector': 'error',
				'prefer-spread': 'error',
				'prefer-starts-ends-with': 'error',
				'prefer-text-content': 'error',
				'prefer-type-error': 'error',
				'prevent-abbreviations': 'error',
				'regex-shorthand': 'error',
				'throw-new-error': 'error'
			}, (key, value) => [`unicorn/${key}`, value])
		}
	}
};
