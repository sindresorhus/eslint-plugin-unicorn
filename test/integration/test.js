#!/usr/bin/env node
'use strict';
const path = require('path');
const Listr = require('listr');
const tempy = require('tempy');
const execa = require('execa');
const del = require('del');
const chalk = require('chalk');

const packages = new Map([
	['got', 'https://github.com/sindresorhus/got'],
	['ava', 'https://github.com/avajs/ava'],
	['pageres', 'https://github.com/sindresorhus/pageres'],
	['np', 'https://github.com/sindresorhus/np'],
	['ora', 'https://github.com/sindresorhus/ora'],
	['p-map', 'https://github.com/sindresorhus/p-map'],
	['detect-indent', 'https://github.com/sindresorhus/detect-indent'],
	['os-locale', 'https://github.com/sindresorhus/os-locale'],
	['execa', 'https://github.com/sindresorhus/execa'],
	['pify', 'https://github.com/sindresorhus/pify'],
	['boxen', 'https://github.com/sindresorhus/boxen'],
	['make-dir', 'https://github.com/sindresorhus/make-dir'],
	['listr', 'http://github.com/SamVerschueren/listr'],
	['clinton', 'http://github.com/SamVerschueren/clinton'],
	['bragg', 'http://github.com/SamVerschueren/bragg'],
	['decode-uri-component', 'https://github.com/SamVerschueren/decode-uri-component']
]);

const cwd = path.join(__dirname, 'eslint-config-unicorn-tester');

const execute = name => {
	const dest = tempy.directory();

	return new Listr([
		{
			title: 'Cloning',
			task: () => execa('git', ['clone', packages.get(name), '--single-branch', dest])
		},
		{
			title: 'Running tests',
			task: () => execa('./node_modules/.bin/eslint', ['--config', path.join(cwd, 'index.js'), dest], {cwd})
				.catch(err => {
					if (!/✖ [0-9]+ problems? \([0-9]+ errors?, [0-9]+ warnings?\)/.test(err.message)) {
						err.package = name;
						throw err;
					}
				})
		},
		{
			title: 'Clean up',
			task: () => del(dest, {force: true})
		}
	], {
		exitOnError: false
	});
};

const list = new Listr([
	{
		title: 'Setup',
		task: () => execa('npm', ['install', '../../..', 'eslint'], {cwd})
	},
	{
		title: 'Integration tests',
		task: () => {
			const tests = new Listr({concurrent: true});

			for (const [name] of packages) {
				tests.add([
					{
						title: name,
						task: () => execute(name)
					}
				]);
			}

			return tests;
		}
	}
]);

list.run()
	.catch(err => {
		for (const error of err.errors) {
			console.error('\n' + chalk.red.bold.underline(error.package));
			console.error(error.message);
		}

		process.exit(1);
	});
