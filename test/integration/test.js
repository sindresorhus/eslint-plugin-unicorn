#!/usr/bin/env node
'use strict';
const path = require('path');
const Listr = require('listr');
const tempy = require('tempy');
const execa = require('execa');
const del = require('del');
const chalk = require('chalk');

const packages = new Map([
	['ava', 'https://github.com/avajs/ava'],
	['chalk', 'https://github.com/chalk/chalk'],
	['wrap-ansi', 'https://github.com/chalk/wrap-ansi'],
	['got', 'https://github.com/sindresorhus/got'],
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
	['listr-update-renderer', 'http://github.com/SamVerschueren/listr-update-renderer'],
	['clinton', 'http://github.com/SamVerschueren/clinton'],
	['bragg', 'http://github.com/SamVerschueren/bragg'],
	['bragg-router', 'http://github.com/SamVerschueren/bragg-router'],
	['dev-time', 'http://github.com/SamVerschueren/dev-time'],
	['decode-uri-component', 'https://github.com/SamVerschueren/decode-uri-component'],
	['to-ico', 'https://github.com/kevva/to-ico'],
	['download', 'https://github.com/kevva/download'],
	['brightness', 'https://github.com/kevva/brightness'],
	['decompress', 'https://github.com/kevva/decompress'],
	['npm-conf', 'https://github.com/kevva/npm-conf'],
	['imagemin', 'https://github.com/imagemin/imagemin'],
	['color-convert', 'https://github.com/qix-/color-convert'],
	['eslint-plugin-unicorn', 'https://github.com/sindresorhus/eslint-plugin-unicorn'],
	['ky', 'https://github.com/sindresorhus/ky'],
	['query-string', 'https://github.com/sindresorhus/query-string'],
	['meow', 'https://github.com/sindresorhus/meow'],
	['globby', 'https://github.com/sindresorhus/globby'],
	['emittery', 'https://github.com/sindresorhus/emittery'],
	['p-queue', 'https://github.com/sindresorhus/p-queue'],
	['pretty-bytes', 'https://github.com/sindresorhus/pretty-bytes'],
	['normalize-url', 'https://github.com/sindresorhus/normalize-url']
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
			task: () => execa('eslint', ['--config', path.join(cwd, 'index.js'), dest], {cwd, localDir: __dirname})
				.catch(error => {
					if (!/✖ \d+ problems? \(\d+ errors?, \d+ warnings?\)/.test(error.message)) {
						error.package = name;
						throw error;
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
	.catch(error => {
		for (const error2 of error.errors) {
			console.error('\n' + chalk.red.bold.underline(error2.package));
			console.error(error2.message);
		}

		process.exit(1);
	});
