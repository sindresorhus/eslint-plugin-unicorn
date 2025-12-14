import {
	getRepositories,
	getPathIgnorePattern,
} from 'eslint-remote-tester-repositories';
import {
	typescriptEslintParser,
	vueEslintParser,
} from '../../scripts/parsers.js';
import eslintPluginUnicorn from '../../index.js';

/** @type {import('eslint-remote-tester').Config} */
const config = {
	/** Repositories to scan */
	repositories: getRepositories({randomize: true}),

	/** Optional pattern used to exclude paths */
	pathIgnorePattern: getPathIgnorePattern(),

	/** Extensions of files under scanning */
	extensions: [
		'js',
		'cjs',
		'mjs',
		'ts',
		'cts',
		'mts',
		'jsx',
		'tsx',
		'vue',
	],

	/** Maximum amount of tasks ran concurrently */
	concurrentTasks: 3,

	/** Optional boolean flag used to enable caching of cloned repositories. For CIs it's ideal to disable caching. Defaults to true. */
	cache: false,

	/** Optional setting for log level. Valid values are verbose, info, warn, error. Defaults to verbose. */
	logLevel: 'info',

	/** ESLint configuration */
	eslintConfig: [
		eslintPluginUnicorn.configs.all,
		{
			rules: {
				// This rule crashing on replace string inside `jsx` or `Unicode escape sequence`
				'unicorn/string-content': 'off',
			},
		},
		{
			files: [
				'**/*.ts',
				'**/*.mts',
				'**/*.cts',
				'**/*.tsx',
			],
			languageOptions: {
				parser: typescriptEslintParser,
				parserOptions: {
					project: [],
				},
			},
		},
		{
			files: [
				'**/*.vue',
			],
			languageOptions: {
				parser: vueEslintParser,
				parserOptions: {
					parser: '@typescript-eslint/parser',
					ecmaFeatures: {
						jsx: true,
					},
					project: [],
				},
			},
		},
	],
};

export default config;
