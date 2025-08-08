import globals from 'globals';
import xo from 'eslint-config-xo';
import eslintPlugin from 'eslint-plugin-eslint-plugin';
import jsdoc from 'eslint-plugin-jsdoc';
import internalRules from './scripts/internal-rules/index.js';
import unicorn from './index.js';

const config = [
	...xo,
	unicorn.configs.recommended,
	internalRules,
	{
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	{
		ignores: [
			'coverage',
			'.cache-eslint-remote-tester',
			'eslint-remote-tester-results',
			'test/integration/{fixtures,fixtures-local}/**',
			'**/*.ts',
		],
	},
	{
		rules: {
			'unicorn/escape-case': 'off',
			'unicorn/expiring-todo-comments': 'off',
			'unicorn/no-hex-escape': 'off',
			'unicorn/no-null': 'error',
			'unicorn/prefer-array-flat': ['error', {
				functions: [
					'flat',
					'flatten',
				],
			}],
			'unicorn/consistent-function-scoping': 'off',
			'import/order': 'off',
			'func-names': 'off',
			'@stylistic/function-paren-newline': 'off',
			'@stylistic/curly-newline': 'off',
		},
	},
	{
		files: [
			'rules/*.js',
		],
		plugins: {
			'eslint-plugin': eslintPlugin,
		},
		rules: {
			...eslintPlugin.configs.all.rules,
			'eslint-plugin/require-meta-docs-description': [
				'error',
				{
					pattern: '.+',
				},
			],
			'eslint-plugin/require-meta-docs-recommended': [
				'error',
				{
					allowNonBoolean: true,
				},
			],
			'eslint-plugin/require-meta-docs-url': 'off',
			'eslint-plugin/require-meta-has-suggestions': 'off',
			'eslint-plugin/require-meta-schema': 'off',
			'eslint-plugin/require-meta-schema-description': 'off',
		},
	},
	{
		files: [
			'**/*.js',
		],
		plugins: {
			jsdoc,
		},
		rules: {
			'jsdoc/require-asterisk-prefix': ['error', 'never', {}],
		},
	},
];

export default config;
