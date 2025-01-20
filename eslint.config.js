import globals from 'globals';
import xo from 'eslint-config-xo';
import eslintPlugin from 'eslint-plugin-eslint-plugin';
import internal from './scripts/internal-rules/index.js';
import unicorn from './index.js';

const config = [
	...xo,
	unicorn.configs.recommended,
	internal.configs.all,
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
			'rules/utils/lodash.js',
			'test/integration/{fixtures,fixtures-local}/**',
			'workaround-for-eslint-doc-generator',
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
			'eslint-plugin/require-meta-docs-url': 'off',
			'eslint-plugin/require-meta-has-suggestions': 'off',
			'eslint-plugin/require-meta-schema': 'off',
			'eslint-plugin/require-meta-schema-description': 'off',
		},
	},
];

export default config;
