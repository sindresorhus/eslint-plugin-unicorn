import fs from 'fs';
import path from 'path';
import test from 'ava';
import pify from 'pify';
import index from '../';

test('Every rule is defined in index file', async t => {
	const files = await pify(fs.readdir)('../rules');
	const ruleFiles = files.filter(file => path.extname(file) === '.js');

	for (const file of ruleFiles) {
		const name = path.basename(file, '.js');
		t.truthy(index.rules[name], `'${name}' is not exported in 'index.js'`);
		t.truthy(index.configs.recommended.rules[`unicorn/${name}`], `'${name}' is not set in the recommended config`);
	}

	t.is(Object.keys(index.rules).length, ruleFiles.length,
		'There are more exported rules than rule files.');
	t.is(Object.keys(index.configs.recommended.rules).length, ruleFiles.length,
		'There are more exported rules in the recommended config than rule files.');
});
