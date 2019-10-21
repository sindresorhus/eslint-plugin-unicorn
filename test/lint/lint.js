#!/usr/bin/env node
'use strict';
const {CLIEngine} = require('eslint');
const unicorn = require('../..');

const {configs: {recommended}} = unicorn;
const {rules} = recommended;
const files = [process.argv[2] || '.'];
const fix = process.argv.includes('--fix');

const cli = new CLIEngine({
	...recommended,
	rules: {
		...rules,

		// TODO: remove this override, when #391 is fixed
		'unicorn/consistent-function-scoping': 'off'
	},
	useEslintrc: false,
	fix
});

cli.addPlugin('eslint-plugin-unicorn', unicorn);

const report = cli.executeOnFiles(files);

if (fix) {
	CLIEngine.outputFixes(report);
}

const formatter = cli.getFormatter();

console.log(formatter(report.results));

process.exit(report.errorCount);
