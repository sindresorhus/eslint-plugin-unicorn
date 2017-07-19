#!/usr/bin/env node
'use strict';
const path = require('path');
const Listr = require('listr');
const tempy = require('tempy');
const execa = require('execa');
const del = require('del');

const packages = new Map([
	['got', 'https://github.com/sindresorhus/got'],
	['ava', 'https://github.com/avajs/ava']
]);

const cwd = path.join(__dirname, 'eslint-config-unicorn-tester');

const execute = url => {
	const dest = tempy.directory();

	return new Listr([
		{
			title: 'Cloning',
			task: () => execa('git', ['clone', url, '--single-branch', dest])
		},
		{
			title: 'Running tests',
			task: () => execa('./node_modules/.bin/eslint', ['--config', path.join(cwd, 'index.js'), dest], {cwd})
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
		task: () => execa('npm', ['install', '../../../', 'eslint'], {cwd})
	},
	{
		title: 'Integration tests',
		task: () => {
			const tests = new Listr({concurrent: true});

			for (const [name, url] of packages.entries()) {
				tests.add([
					{
						title: name,
						task: () => execute(url)
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
			console.error(error.message);
		}
	});
