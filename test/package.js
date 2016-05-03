import fs from 'fs';
import test from 'ava';
import pify from 'pify';
import index from '../';

test('Every rule is defined in index file', async t => {
	const files = await pify(fs.readdir, Promise)('../rules/');
	const rules = files.filter(file => file.indexOf('.js') === file.length - 3);

	rules.forEach(file => {
		const name = file.slice(0, -3);
		t.truthy(index.rules[name], `'${name}' is not exported in 'index.js'`);
		t.truthy(index.configs.recommended.rules[`xo/${name}`], `'${name}' is not set in the recommended config`);
	});

	t.is(Object.keys(index.rules).length, rules.length,
		'There are more exported rules than rule files.');
	t.is(Object.keys(index.configs.recommended.rules).length, rules.length,
		'There are more exported rules in the recommended config than rule files.');
});
