/* Run all unicorn rules on codebase */
/*
! If you're making a new rule, you can ignore this before review.
*/

import eslintPluginUnicorn from './index.js';

const config = [
	eslintPluginUnicorn.configs['flat/all'],
	{
		linterOptions: {
			reportUnusedDisableDirectives: false,
		},
	},
	{
		ignores: [
			'coverage',
			'test/integration/fixtures',
			'test/integration/fixtures-local',
			'rules/utils/lodash.js',
		],
	},
	{
		rules: {
			// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1109#issuecomment-782689255
			'unicorn/consistent-destructuring': 'off',
			// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2341
			'unicorn/escape-case': 'off',
			'unicorn/no-hex-escape': 'off',
			// Buggy
			'unicorn/custom-error-definition': 'off',
			'unicorn/consistent-function-scoping': 'off',
			// Annoying
			'unicorn/no-keyword-prefix': 'off',
			// Removed when node 18.x is deprecated
			// https://github.com/sindresorhus/eslint-plugin-unicorn/pull/2428#issuecomment-2303599691
			'unicorn/prefer-change-array-by-copy': 'off',
		},
	},
	{
		files: [
			'**/*.js',
		],
		rules: {
			'unicorn/prefer-module': 'off',
		},
	},
];

export default config;
