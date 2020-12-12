'use strict';

module.exports = {
	/** Repositories to scan */
	repositories: require('./repositories.json'),

	/** Extensions of files under scanning */
	extensions: ['js', 'jsx', 'ts', 'tsx'],

	/** Optional pattern used to exclude paths */
	pathIgnorePattern: `(${[
		'node_modules',
		'\\/\\.', // Any file or directory starting with dot, e.g. '.git'
		'/dist/',
		'/build/',
		// Common patterns for minified JS
		'babel\\.js',
		'vendor\\.js',
		'vendors\\.js',
		'chunk\\.js',
		'bundle\\.js',
		'react-dom\\.development\\.js',
		'\\.min\\.js' // Any *.min.js
	].join('|')})`,

	/** Empty array since we are only interested in linter crashes */
	rulesUnderTesting: [],

	/** Maximum amount of tasks ran concurrently */
	concurrentTasks: 3,

	/** Optional boolean flag used to enable caching of cloned repositories. For CIs it's ideal to disable caching. Defauls to true. */
	cache: false,

	/** Optional setting for log level. Valid values are verbose, info, warn, error. Defaults to verbose. */
	logLevel: 'info',

	/** ESLint configuration */
	eslintrc: {
		root: true,
		env: {
			es6: true
		},
		parser: '@typescript-eslint/parser',
		parserOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
			ecmaFeatures: {
				jsx: true
			}
		},
		extends: ['plugin:unicorn/recommended']
	}
};
