#!/usr/bin/env node
'use strict';
const assert = require('assert');
const {CLIEngine} = require('eslint');
const unicorn = require('../..');

const {recommended} = unicorn.configs;
const files = [process.argv[2] || '.'];
const fix = process.argv.includes('--fix');
const ruleIds = Object.keys(unicorn.rules);
const unicornRules = new Map(Object.entries(unicorn.rules));

const cli = new CLIEngine({
	baseConfig: recommended,
	rules: {
		// TODO: remove this override, when #391 is fixed
		'unicorn/consistent-function-scoping': 'off'
	},
	// Prevent plugin load from other place
	resolvePluginsRelativeTo: __dirname,
	useEslintrc: false,
	fix
});

// Make sure rules are not loaded
const loadedRulesBefore = cli.getRules();
assert(
	!ruleIds.some(ruleId => loadedRulesBefore.has(`unicorn/${ruleId}`)),
	'`eslint-plugin-unicorn` rules should not loaded before `addPlugin` is called.'
)

cli.addPlugin('eslint-plugin-unicorn', unicorn);

// Make sure rules are loaded from codebase
const loadedRules = cli.getRules();
assert(
	ruleIds.every(ruleId => unicornRules.get(ruleId) === loadedRules.get(`unicorn/${ruleId}`)),
	'`eslint-plugin-unicorn` rules are not loaded from codebase.'
)

const report = cli.executeOnFiles(files);

const {errorCount, warningCount, fixableErrorCount, fixableWarningCount} = report;

const hasFixable = fixableErrorCount || fixableWarningCount;

if (fix && hasFixable) {
	CLIEngine.outputFixes(report);
}

if (errorCount || warningCount) {
	const formatter = cli.getFormatter();
	console.log(formatter(report.results));

	console.log();
	console.log('Some tests have failed, you need fix them and run `npm run lint <file>` to check again.');

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
