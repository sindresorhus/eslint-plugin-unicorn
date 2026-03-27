import globals from 'globals';
import xo from 'eslint-config-xo';
import eslintPlugin from 'eslint-plugin-eslint-plugin';
import jsdoc from 'eslint-plugin-jsdoc';
import nodeStyleTextConfig from 'node-style-text/eslint-config';
import internalRules from './scripts/internal-rules/index.js';

const config = [
	...xo(),
	nodeStyleTextConfig,
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
		files: ['**/*.js'],
		rules: {
			'no-sequences': ['error', {allowInParentheses: false}],
			'require-unicode-regexp': 'off',
			'no-shadow': 'off',
			'no-unused-vars': 'off',
			'no-undef': 'off',
			'import-x/no-anonymous-default-export': 'off',
			'ava/no-conditional-assertion': 'off',
			'n/prefer-global/process': 'off',
			'unicorn/escape-case': 'off',
			'unicorn/expiring-todo-comments': 'off',
			'unicorn/no-hex-escape': 'off',
			'unicorn/no-null': 'off',
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
			// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2833
			'unicorn/template-indent': ['error', {indent: '\t'}],
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
			'eslint-plugin/require-meta-schema-description': 'error',
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
