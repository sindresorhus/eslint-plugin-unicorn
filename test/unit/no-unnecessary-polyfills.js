import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, {after, before} from 'node:test';
import {Linter} from 'eslint';
import unicorn from '../../index.js';
import {getBestMatchingPolyfill} from '../../rules/no-unnecessary-polyfills.js';

// Browserslist reads its configuration from these environment variables before looking at files
const browserslistEnvironment = new Map();
before(() => {
	for (const name of ['BROWSERSLIST', 'BROWSERSLIST_CONFIG']) {
		if (process.env[name] !== undefined) {
			browserslistEnvironment.set(name, process.env[name]);
			delete process.env[name];
		}
	}
});
after(() => {
	for (const [name, value] of browserslistEnvironment) {
		process.env[name] = value;
	}
});

test('getBestMatchingPolyfill prefers the least specific match for constructor polyfills', t => {
	const polyfillCandidates = [
		{
			feature: 'es.symbol.description',
			pattern: /^es6-symbol$/v,
		},
		{
			feature: 'es.symbol',
			pattern: /^es6-symbol$/v,
		},
		{
			feature: 'es.symbol.async-dispose',
			pattern: /^es6-symbol$/v,
		},
	];

	const polyfill = getBestMatchingPolyfill(polyfillCandidates, 'es6-symbol');

	t.assert.strictEqual(polyfill?.feature, 'es.symbol');
});

test('getBestMatchingPolyfill keeps method-specific matches', t => {
	const polyfillCandidates = [
		{
			feature: 'es.promise.finally',
			pattern: /^p-finally$/v,
		},
		{
			feature: 'es.promise',
			pattern: /^promise-polyfill$/v,
		},
	];

	const polyfill = getBestMatchingPolyfill(polyfillCandidates, 'p-finally');

	t.assert.strictEqual(polyfill?.feature, 'es.promise.finally');
});

test('there are no targets without a Browserslist configuration or `package.json`', t => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'unicorn-no-unnecessary-polyfills-'));
	t.after(() => {
		fs.rmSync(directory, {recursive: true, force: true});
	});

	const linter = new Linter({cwd: directory});
	const lint = options => linter.verify(
		'require("setprototypeof")',
		{
			plugins: {unicorn},
			rules: {'unicorn/no-unnecessary-polyfills': ['error', ...options]},
		},
		path.join(directory, 'index.js'),
	);

	t.assert.deepStrictEqual(lint([]), []);
	t.assert.strictEqual(lint([{targets: 'node >4'}]).length, 1);
});
