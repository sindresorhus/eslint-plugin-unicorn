#!/usr/bin/env node
'use strict';
const Listr = require('listr');
const tempy = require('tempy');
const execa = require('execa');
require('any-observable/register/rxjs-all');	// eslint-disable-line import/no-unassigned-import
const Observable = require('any-observable');
const streamToObservable = require('stream-to-observable');
const split = require('split');
const del = require('del');

const packages = new Map([
	['got', 'https://github.com/sindresorhus/got']
]);

const exec = (cmd, args) => {
	// Use `Observable` support if merged https://github.com/sindresorhus/execa/pull/26
	const cp = execa(cmd, args);

	return Observable.merge(
		streamToObservable(cp.stdout.pipe(split()), {await: cp}),
		streamToObservable(cp.stderr.pipe(split()), {await: cp})
	).filter(Boolean);
};

const execute = url => {
	const dest = tempy.directory();

	return new Listr([
		{
			title: 'Cloning',
			task: () => exec('git', ['clone', url, '--single-branch', dest])
		},
		{
			title: 'Running tests',
			task: () => exec('./node_modules/.bin/eslint', ['--config', './config.json'])
		},
		{
			title: 'Clean up',
			task: () => del(dest, {force: true})
		}
	]);
};

const list = new Listr();

for (const [name, url] of packages.entries()) {
	list.add([
		{
			title: name,
			task: () => execute(url)
		}
	]);
}

list.run();
