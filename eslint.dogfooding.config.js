/* Run all unicorn rules on codebase */
/*
! If you're making a new rule, you can ignore this before review.
*/
import jsdoc from 'eslint-plugin-jsdoc';
import eslintPluginUnicorn from './index.js';

const config = [
	eslintPluginUnicorn.configs.all,
	{
		linterOptions: {
			reportUnusedDisableDirectives: false,
		},
		// Fake rule to allow inline config to disable
		plugins: {
			n: {
				rules: {
					'no-unsupported-features/es-syntax': {},
				},
			},
			'eslint-plugin': {
				rules: {
					'require-meta-default-options': {},
				},
			},
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
	{
		plugins: {
			jsdoc,
		},
		rules: {
			'jsdoc/require-asterisk-prefix': ['error', 'never', {}],
		},
	},
];

export default config;
