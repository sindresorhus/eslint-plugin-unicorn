import fs from 'fs';
import path from 'path';
import test from 'ava';
import pify from 'pify';
import index from '..';

let ruleFiles;

test.before(async () => {
	const files = await pify(fs.readdir)('rules');
	ruleFiles = files.filter(file => path.extname(file) === '.js');
});

test('Every rule is defined in index file', t => {
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

test('Every rule has valid meta.type', t => {
	const validTypes = ['problem', 'suggestion', 'layout'];

	for (const file of ruleFiles) {
		const name = path.basename(file, '.js');
		const rule = index.rules[name];

		t.true(rule.meta !== null && rule.meta !== undefined, `${name} has no meta`);
		t.is(typeof rule.meta.type, 'string', `${name} meta.type is not string`);
		t.true(validTypes.includes(rule.meta.type), `${name} meta.type is not one of [${validTypes.join(', ')}]`);
	}
});
