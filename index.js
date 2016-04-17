'use strict';

module.exports = {
	rules: {
		'filename-case': require('./rules/filename-case'),
		'no-process-exit': require('./rules/no-process-exit'),
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
				'xo/filename-case': ['error', {case: 'kebabCase'}],
				'xo/no-process-exit': 'error',
				'xo/throw-new-error': 'error'
			}
		}
	}
};
