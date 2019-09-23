#!/usr/bin/env node
'use strict';

const path = require('path');

const ROOT = path.join(__dirname, '../../');
const module = require(ROOT)

const CLIEngine = require("eslint").CLIEngine;
const cli = new CLIEngine({
	...module.config.recommended,
	cwd: ROOT,
	useEslintrc : false,
});

cli.addPlugin("eslint-plugin-unicorn", module);

const report = cli.executeOnFiles(["."]);

const formatter = cli.getFormatter();

console.log(formatter(report.results));

process.exit(report.errorCount);
