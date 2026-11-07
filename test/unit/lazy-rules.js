import {execFileSync} from 'node:child_process';
import module from 'node:module';
import test from 'node:test';
import plugin from '../../index.js';
import * as rawRules from '../../rules/index.js';
import toEslintRule from '../../rules/rule/to-eslint-rule.js';

// eslint-disable-next-line node-test/no-skip-test -- Module loading hooks were added after the minimum supported Node.js version.
test('importing the plugin and validating presets leaves unused rule implementations unloaded', {skip: !module.registerHooks && 'Module loading hooks require Node.js 22.15 or later'}, t => {
	const script = `
		import assert from 'node:assert/strict';
		import {registerHooks, createRequire} from 'node:module';

		const ruleDirectory = new URL('./rules/', import.meta.url).href;
		const loadedRules = [];
		const loadedModules = new Set();
		registerHooks({
			load(url, context, nextLoad) {
				loadedModules.add(url);
				if (url.startsWith(ruleDirectory) && !url.slice(ruleDirectory.length).includes('/') && !url.endsWith('/index.js')) {
					loadedRules.push(url.slice(ruleDirectory.length));
				}

				return nextLoad(url, context);
			},
		});

		const require = createRequire(import.meta.url);
		const plugin = require('./index.js').default;
		const {ESLint, Linter} = require('eslint');
		const eslint = new ESLint({overrideConfigFile: true, overrideConfig: plugin.configs.recommended});
		await eslint.calculateConfigForFile('fixture.js');
		const eagerRules = ['expiring-todo-comments.js', 'id-match.js', 'logical-assignment-operators.js', 'operator-assignment.js'];
		assert.deepEqual(loadedRules.toSorted(), eagerRules.toSorted());

		const linter = new Linter();
		const config = {plugins: {unicorn: plugin}, rules: {'unicorn/prefer-node-protocol': 'error'}};
		for (const filename of ['first.js', 'second.js']) {
			const result = linter.verifyAndFix('import fs from "fs";', config, {filename});
			assert.equal(result.output, 'import fs from "node:fs";');
			assert.deepEqual(result.messages, []);
		}

		const identifierConfig = {plugins: {unicorn: plugin}, rules: {'unicorn/id-match': ['error', '^[a-z]+$']}};
		const messages = linter.verify('let fooBar;', identifierConfig);
		assert.equal(messages.length, 1);
		assert.equal(messages[0].ruleId, 'unicorn/id-match');
		for (const filename of ['utils/index.js', 'shared/css-identifiers.js', 'shared/html-identifiers.js']) {
			assert.equal(loadedModules.has(new URL(filename, ruleDirectory).href), false, filename + ' should remain unloaded');
		}
		assert.equal([...loadedModules].some(url => url.includes('/node_modules/@eslint/css-tree/')), false);

		console.log(JSON.stringify(loadedRules.toSorted()));
	`;
	const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {cwd: new URL('../../', import.meta.url), encoding: 'utf8'});
	const expectedRules = [
		'expiring-todo-comments.js',
		'id-match.js',
		'logical-assignment-operators.js',
		'operator-assignment.js',
		'prefer-node-protocol.js',
	].toSorted((first, second) => first.localeCompare(second));
	t.assert.deepStrictEqual(JSON.parse(output), expectedRules);
});

test('generated rule metadata matches the implementations', async t => {
	await Promise.all(Object.keys(rawRules).map(async ruleName => {
		const {default: rule} = await import(new URL(`../../rules/${ruleName}.js`, import.meta.url));
		t.assert.deepStrictEqual(plugin.rules[ruleName].meta, toEslintRule(ruleName, rule).meta, `Regenerate rule metadata with npm run create-rules-index-file (${ruleName}).`);
	}));
});
