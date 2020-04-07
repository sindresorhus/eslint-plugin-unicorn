#!/usr/bin/env node
'use strict';
const {CLIEngine} = require('eslint');
const unicorn = require('../..');

const {recommended} = unicorn.configs;
const files = [process.argv[2] || '.'];
const fix = process.argv.includes('--fix');
const ruleIds = Object.keys(unicorn.rules);
const unicornRules = new Map(Object.entries(unicorn.rules));

const cli = new CLIEngine({
	baseConfig: recommended,
	useEslintrc: false,
	fix
});

cli.addPlugin('eslint-plugin-unicorn', unicorn);

// Make sure rules are loaded from codebase
const loadedRules = cli.getRules();
if (!ruleIds.every(ruleId => unicornRules.get(ruleId) === loadedRules.get(`unicorn/${ruleId}`))) {
	console.error('`eslint-plugin-unicorn` rules are not loaded from codebase.');
	process.exit(1);
}

const report = cli.executeOnFiles(files);

const {
	errorCount,
	warningCount,
	fixableErrorCount,
	fixableWarningCount
} = report;

const hasFixable = fixableErrorCount || fixableWarningCount;

if (fix) {
	CLIEngine.outputFixes(report);
}

if (errorCount || warningCount) {
	const formatter = cli.getFormatter();
	console.log(formatter(report.results));

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
