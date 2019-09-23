#!/usr/bin/env node
'use strict';

const path = require('path');

const ROOT = path.join(__dirname, '../../');
const unicorn = require(ROOT);

const {CLIEngine} = require('eslint');

const cli = new CLIEngine({
	...unicorn.configs.recommended,
	cwd: ROOT,
	useEslintrc: false
});

cli.addPlugin('eslint-plugin-unicorn', unicorn);

const report = cli.executeOnFiles(['.']);

const formatter = cli.getFormatter();

console.log(formatter(report.results));

process.exit(report.errorCount);
