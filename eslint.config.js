import globals from 'globals';
import xo from 'eslint-config-xo';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import eslintPlugin from 'eslint-plugin-eslint-plugin';
import nodeStyleTextConfig from 'node-style-text/eslint-config';
import internalRules from './scripts/internal-rules/index.js';

const disabledJsdocRules = Object.fromEntries(
	Object.keys(jsdocPlugin.rules).map(name => [`jsdoc/${name}`, 'off']),
);

// `eslint-config-xo` and `eslint-plugin-ava` both define `plugin json` for
// different file scopes; keep everything as-is except dropping the duplicate json
// entry on the package.json block to avoid flat-config plugin redefinition.
const xoConfig = xo().map(configBlock => {
	if (!(configBlock.files?.includes('**/package.json') && configBlock.plugins?.json)) {
		return configBlock;
	}

	const {json, ...plugins} = configBlock.plugins;
	return {
		...configBlock,
		plugins,
	};
});

const config = [
	...xoConfig,
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
			// Snapshot fixtures are generated markdown and currently trigger
			// markdown processor `getLoc` crashes under this ESLint setup.
			'test/**/snapshots/**',
			'**/*.ts',
		],
	},
	{
		rules: disabledJsdocRules,
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
			// These `regexp/*` rules flag our own rule-implementation regexes, which run on source
			// code at lint time rather than untrusted input, and rewriting them would hurt readability.
			'regexp/optimal-quantifier-concatenation': 'off',
			'regexp/no-super-linear-move': 'off',
			'regexp/no-super-linear-backtracking': 'off',
			'regexp/strict': 'off',
			'regexp/no-control-character': 'off',
			'regexp/prefer-named-capture-group': 'off',
			// Our long-standing `eslint-disable` directives predate this rule and are self-explanatory.
			'@eslint-community/eslint-comments/require-description': 'off',
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
];

export default config;
