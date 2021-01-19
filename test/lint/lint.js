#!/usr/bin/env node
'use strict';
const {ESLint} = require('eslint');
const unicorn = require('../..');

const {recommended} = unicorn.configs;
const files = [process.argv[2] || '.'];
const fix = process.argv.includes('--fix');

const eslint = new ESLint({
	baseConfig: recommended,
	useEslintrc: false,
	plugins: {
		unicorn
	},
	fix,
	overrideConfig: {
		ignorePatterns: [
			'coverage',
			'test/integration/fixtures',
			'test/integration/unicorn'
		],
		rules: {
			'unicorn/prevent-abbreviations': [
				'error',
				{
					replacements: {
						fn: false
					}
				}
			]
		}
	}
});

const sum = (collection, fieldName) => {
	let result = 0;
	for (const item of collection) {
		result += item[fieldName];
	}

	return result;
};

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
		console.log(`You need to fix the failed test${errorCount + warningCount > 1 ? 's' : ''} above and run \`npm run lint <file>\` to check again.`);

		if (hasFixable) {
			console.log();
			console.log('You may also want run `npm run lint <file> --fix` to fix fixable problems.');
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
