'use strict';

const {getRepositories, getPathIgnorePattern} = require('eslint-remote-tester-repositories');

module.exports = {
	/** Repositories to scan */
	repositories: getRepositories({randomize: true}),

	/** Optional pattern used to exclude paths */
	pathIgnorePattern: getPathIgnorePattern(),

	/** Extensions of files under scanning */
	extensions: ['js', 'cjs', 'mjs', 'ts', 'cts', 'mts', 'jsx', 'tsx'],

	/** Maximum amount of tasks ran concurrently */
	concurrentTasks: 3,

	/** Optional boolean flag used to enable caching of cloned repositories. For CIs it's ideal to disable caching. Defaults to true. */
	cache: false,

	/** Optional setting for log level. Valid values are verbose, info, warn, error. Defaults to verbose. */
	logLevel: 'info',

	/** ESLint configuration */
	eslintrc: {
		root: true,
		parser: '@typescript-eslint/parser',
		parserOptions: {
			ecmaFeatures: {
				jsx: true,
			},
		},
		extends: ['plugin:unicorn/all'],
	},
};
