#!/usr/bin/env node
import process from 'node:process';
import {parseArgs} from 'node:util';
import eslintExperimentalApis from 'eslint/use-at-your-own-risk';
import chalk from 'chalk';
import {outdent} from 'outdent';
import eslintPluginUnicorn from '../../index.js';

const {FlatESLint} = eslintExperimentalApis;

const configs = [
	// TODO: Use `eslintPluginUnicorn.configs.all` instead when we change preset to flat config
	{
		plugins: {
			unicorn: eslintPluginUnicorn,
		},
		rules: eslintPluginUnicorn.configs.all.rules,
	},
	{
		ignores: [
			'coverage',
			'test/integration/fixtures/**',
			'test/integration/fixtures-local/**',
		],
		rules: {
			// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1109#issuecomment-782689255
			'unicorn/consistent-destructuring': 'off',
			// Buggy
			'unicorn/custom-error-definition': 'off',
			'unicorn/consistent-function-scoping': 'off',
			// Annoying
			'unicorn/no-keyword-prefix': 'off',
			'unicorn/no-unsafe-regex': 'off',
			// Not ready yet
			'unicorn/prefer-string-replace-all': 'off',
			'unicorn/prefer-at': 'off',
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

const {
	values: {
		fix = false,
	},
	positionals: patterns,
} = parseArgs({
	options: {
		fix: {
			type: 'boolean',
		},
	},
	allowPositionals: true,
});

const sum = (collection, fieldName) =>
	collection.reduce((total, {[fieldName]: value}) => total + value, 0);

async function run() {
	const eslint = new FlatESLint({
		overrideConfigFile: true,
		overrideConfig: configs,
		fix,
	});

	const results = await eslint.lintFiles(patterns.length === 0 ? ['.'] : patterns);

	if (fix) {
		await FlatESLint.outputFixes(results);
	}

	const errorCount = sum(results, 'errorCount');
	const warningCount = sum(results, 'warningCount');
	const fixableErrorCount = sum(results, 'fixableErrorCount');
	const fixableWarningCount = sum(results, 'fixableWarningCount');

	const hasFixable = fixableErrorCount || fixableWarningCount;
	const summary = outdent`
		${results.length} files linted:
			- error: ${chalk.gray(errorCount)}
			- warning: ${chalk.gray(warningCount)}
			- fixable error: ${chalk.gray(fixableErrorCount)}
			- fixable warning: ${chalk.gray(fixableWarningCount)}
	`;

	if (errorCount || warningCount) {
		console.log('*! If you\'re making a new rule, you can ignore this before review. !*');

		console.log();
		console.log(summary);

		const {format} = await eslint.loadFormatter();
		console.log();
		console.log(format(results));

		console.log();
		console.log(`You need to fix the failed test${errorCount + warningCount > 1 ? 's' : ''} above and run \`npm run run-rules-on-codebase -- <file>\` to check again.`);

		if (hasFixable) {
			console.log();
			console.log('You may also want run `npm run run-rules-on-codebase -- <file> --fix` to fix fixable problems.');
		}
	} else {
		console.log(summary);
		console.log();
		console.log('All tests have passed.');
	}

	process.exit(errorCount);
}

await run();
