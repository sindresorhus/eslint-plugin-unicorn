#!/usr/bin/env node
import process from 'node:process';
import {ESLint} from 'eslint';
import unicorn from '../../index.js';
import allConfig from '../../configs/all.js';

const files = [process.argv[2] || '.'];
const fix = process.argv.includes('--fix');

const eslint = new ESLint({
	baseConfig: allConfig,
	useEslintrc: false,
	extensions: ['.js', '.mjs'],
	plugins: {
		unicorn,
	},
	fix,
	overrideConfig: {
		ignorePatterns: [
			'coverage',
			'test/integration/fixtures',
			'test/integration/fixtures-local',
		],
		rules: {
			'unicorn/prevent-abbreviations': [
				'error',
				{
					replacements: {
						fn: false,
					},
				},
			],
			// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1109#issuecomment-782689255
			'unicorn/consistent-destructuring': 'off',
			'unicorn/prefer-array-flat': [
				'error',
				{
					functions: [
						'flat',
						'flatten',
					],
				},
			],
			// Annoying
			'unicorn/no-keyword-prefix': 'off',
			'unicorn/no-unsafe-regex': 'off',
			// Outdated
			'unicorn/import-index': 'off',
			// Not ready yet
			'unicorn/prefer-string-replace-all': 'off',
			'unicorn/prefer-top-level-await': 'off',
			'unicorn/prefer-object-has-own': 'off',
			'unicorn/prefer-at': 'off',
			// TODO: Turn this on when `xo` updated `eslint-plugin-unicorn`
			'unicorn/relative-url-style': 'off',
		},
		overrides: [
			{
				files: [
					'**/*.js',
				],
				rules: {
					'unicorn/prefer-module': 'off',
				},
			},
		],
	},
});

const sum = (collection, fieldName) =>
	collection.reduce((total, {[fieldName]: value}) => total + value, 0);

(async function () {
	const results = await eslint.lintFiles(files);

	if (fix) {
		await ESLint.outputFixes(results);
	}

	const errorCount = sum(results, 'errorCount');
	const warningCount = sum(results, 'warningCount');
	const fixableErrorCount = sum(results, 'fixableErrorCount');
	const fixableWarningCount = sum(results, 'fixableWarningCount');

	const hasFixable = fixableErrorCount || fixableWarningCount;

	if (errorCount || warningCount) {
		const {format} = await eslint.loadFormatter();
		console.log(format(results));

		console.log();
		console.log(`You need to fix the failed test${errorCount + warningCount > 1 ? 's' : ''} above and run \`npm run run-rules-on-codebase <file>\` to check again.`);

		if (hasFixable) {
			console.log();
			console.log('You may also want run `npm run run-rules-on-codebase <file> --fix` to fix fixable problems.');
		}

		console.log();
		console.log('* If you\'re making a new rule, you can fix this later. *');
	} else {
		console.log('All tests have passed.');
	}

	process.exit(errorCount);
})().catch(error => {
	process.exitCode = 1;
	console.error(error);
});
