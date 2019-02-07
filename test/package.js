import fs from 'fs';
import path from 'path';
import test from 'ava';
import pify from 'pify';
import index from '..';

test('Every rule is defined in index file', async t => {
	const files = await pify(fs.readdir)('rules');
	const ruleFiles = files.filter(file => path.extname(file) === '.js');

	for (const file of ruleFiles) {
		const name = path.basename(file, '.js');
		t.truthy(index.rules[name], `'${name}' is not exported in 'index.js'`);
		t.truthy(index.configs.recommended.rules[`unicorn/${name}`], `'${name}' is not set in the recommended config`);
		t.truthy(fs.existsSync(path.join('docs/rules', `${name}.md`)), `There is no documentation for '${name}'`);
		t.truthy(fs.existsSync(path.join('test', file)), `There are no tests for '${name}'`);
	}

	t.is(Object.keys(index.rules).length, ruleFiles.length,
		'There are more exported rules than rule files.');
	t.is(Object.keys(index.configs.recommended.rules).length, ruleFiles.length,
		'There are more exported rules in the recommended config than rule files.');
});

test('Every fixable rule got valid meta.type', async t => {
	const validTypes = ['problem', 'suggestion', 'layout'];

	const files = await pify(fs.readdir)('rules');
	const ruleFiles = files.filter(file => path.extname(file) === '.js');
	for (const file of ruleFiles) {
		const name = path.basename(file, '.js');
		const rule = require(`../rules/${name}`);
		t.true(rule.meta !== null, `${name} got no meta`);
		if (rule.meta.fixable) {
			t.true(rule.meta.type !== null, `${name} got no meta.type`);
			t.true(validTypes.includes(rule.meta.type), `${name} meta.type is not one of [${validTypes.join(', ')}]`);
		}
	}
});
