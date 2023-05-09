import fs, {promises as fsAsync} from 'node:fs';
import path from 'node:path';
import test from 'ava';
import {ESLint} from 'eslint';
import * as eslintrc from '@eslint/eslintrc';
import eslintPluginUnicorn from '../index.js';

let ruleFiles;

test.before(async () => {
	const files = await fsAsync.readdir('rules');
	ruleFiles = files.filter(file => path.extname(file) === '.js');
});

const ignoredRules = [
	'no-nested-ternary',
	'no-negated-condition',
];

const deprecatedRules = Object.entries(eslintPluginUnicorn.rules)
	.filter(([, {meta: {deprecated}}]) => deprecated)
	.map(([ruleId]) => ruleId);

const testSorted = (t, actualOrder, sourceName) => {
	actualOrder = actualOrder.filter(x => !ignoredRules.includes(x));
	const sortedOrder = [...actualOrder].sort();

	for (const [wantedIndex, name] of sortedOrder.entries()) {
		const actualIndex = actualOrder.indexOf(name);
		const whereMessage = (wantedIndex === 0) ? '' : `, after '${sortedOrder[wantedIndex - 1]}'`;
		t.is(actualIndex, wantedIndex, `${sourceName} should be alphabetically sorted, '${name}' should be placed at index ${wantedIndex}${whereMessage}`);
	}
};

const RULES_WITHOUT_PASS_FAIL_SECTIONS = new Set([
	// Doesn't show code samples since it's just focused on filenames.
	'filename-case',
	// Intended to not use `pass`/`fail` section in this rule.
	'prefer-modern-math-apis',
]);

test('Every rule is defined in index file in alphabetical order', t => {
	for (const file of ruleFiles) {
		const name = path.basename(file, '.js');
		t.truthy(eslintPluginUnicorn.rules[name], `'${name}' is not exported in 'index.js'`);
		if (!deprecatedRules.includes(name)) {
			t.truthy(
				eslintPluginUnicorn.configs.recommended.rules[`unicorn/${name}`],
				`'${name}' is not set in the recommended config`,
			);
		}

		t.truthy(fs.existsSync(path.join('docs/rules', `${name}.md`)), `There is no documentation for '${name}'`);
		t.truthy(fs.existsSync(path.join('test', file.replace(/\.js$/, '.mjs'))), `There are no tests for '${name}'`);
	}

	t.is(
		Object.keys(eslintPluginUnicorn.rules).length - deprecatedRules.length,
		ruleFiles.length,
		'There are more exported rules than rule files.',
	);
	t.is(
		Object.keys(eslintPluginUnicorn.configs.recommended.rules).length - deprecatedRules.length - ignoredRules.length,
		ruleFiles.length - deprecatedRules.length,
		'There are more exported rules in the recommended config than rule files.',
	);
	t.is(
		Object.keys(eslintPluginUnicorn.configs.all.rules).length - deprecatedRules.length - ignoredRules.length,
		ruleFiles.length - deprecatedRules.length,
		'There are more rules than those exported in the all config.',
	);

	testSorted(t, Object.keys(eslintPluginUnicorn.configs.recommended.rules), 'configs.recommended.rules');
});

test('validate configuration', async t => {
	const results = await Promise.all(
		Object.entries(eslintPluginUnicorn.configs).map(async ([name, config]) => {
			const eslint = new ESLint({
				baseConfig: config,
				useEslintrc: false,
				plugins: {
					unicorn: eslintPluginUnicorn,
				},
			});

			const result = await eslint.calculateConfigForFile('dummy.js');

			return {name, config, result};
		}),
	);

	for (const {name, config, result} of results) {
		t.deepEqual(
			Object.keys(result.rules),
			Object.keys(config.rules),
			`Configuration for "${name}" is invalid.`,
		);
	}

	// `env`
	{
		// https://github.com/eslint/eslint/blob/32ac37a76b2e009a8f106229bc7732671d358189/conf/globals.js#L19
		const testObjects = [
			'undefinedGlobalObject',
			// `es3`
			'Array',
			// `es5`
			'JSON',
			// `es2015`(`es6`)
			'Promise',
			// `es2021`
			'WeakRef',
		];
		const baseOptions = {
			useEslintrc: false,
			plugins: {
				unicorn: eslintPluginUnicorn,
			},
			overrideConfig: {
				rules: {
					'no-undef': 'error',
				},
			},
		};
		const getUndefinedGlobals = async options => {
			const [{messages}] = await new ESLint({...baseOptions, ...options}).lintText(testObjects.join(';\n'));
			return messages.map(({message}) => message.match(/^'(?<object>.*)' is not defined\.$/).groups.object);
		};

		t.deepEqual(await getUndefinedGlobals(), ['undefinedGlobalObject', 'Promise', 'WeakRef']);
		t.deepEqual(await getUndefinedGlobals({baseConfig: eslintPluginUnicorn.configs.recommended}), ['undefinedGlobalObject']);

		const availableEnvironments = [...eslintrc.Legacy.environments.keys()].filter(name => /^es\d+$/.test(name));
		const recommendedEnvironments = Object.keys(eslintPluginUnicorn.configs.recommended.env);
		t.is(recommendedEnvironments.length, 1);
		t.is(
			availableEnvironments[availableEnvironments.length - 1],
			recommendedEnvironments[0],
			'env should be the latest es version',
		);
	}

	// `sourceType`
	{
		const text = 'import fs from "node:fs";';
		const baseOptions = {
			useEslintrc: false,
			plugins: {
				unicorn: eslintPluginUnicorn,
			},
		};
		const runEslint = async options => {
			const [{messages}] = await new ESLint({...baseOptions, ...options}).lintText(text);
			return messages;
		};

		const [{message}] = await runEslint();
		t.is(message, 'Parsing error: The keyword \'import\' is reserved');
		t.deepEqual(await runEslint({baseConfig: eslintPluginUnicorn.configs.recommended}), []);
	}
});

test('Every rule has valid meta.type', t => {
	const validTypes = ['problem', 'suggestion', 'layout'];

	for (const file of ruleFiles) {
		const name = path.basename(file, '.js');
		const rule = eslintPluginUnicorn.rules[name];

		t.true(rule.meta !== null && rule.meta !== undefined, `${name} has no meta`);
		t.is(typeof rule.meta.type, 'string', `${name} meta.type is not string`);
		t.true(validTypes.includes(rule.meta.type), `${name} meta.type is not one of [${validTypes.join(', ')}]`);
	}
});

test('Every deprecated rules listed in docs/deprecated-rules.md', async t => {
	const content = await fsAsync.readFile('docs/deprecated-rules.md', 'utf8');
	const rulesInMarkdown = content.match(/(?<=^## ).*?$/gm);
	t.deepEqual(deprecatedRules, rulesInMarkdown);

	for (const name of deprecatedRules) {
		const rule = eslintPluginUnicorn.rules[name];
		t.is(typeof rule.create, 'function', `${name} create is not function`);
		t.deepEqual(rule.create(), {}, `${name} create should return empty object`);
		t.true(rule.meta.deprecated, `${name} meta.deprecated should be true`);
	}
});

test('Every rule file has the appropriate contents', t => {
	for (const ruleFile of ruleFiles) {
		const ruleName = path.basename(ruleFile, '.js');
		const rulePath = path.join('rules', `${ruleName}.js`);
		const ruleContents = fs.readFileSync(rulePath, 'utf8');

		t.true(ruleContents.includes('/** @type {import(\'eslint\').Rule.RuleModule} */'), `${ruleName} includes jsdoc comment for rule type`);
	}
});

test('Every rule has a doc with the appropriate content', t => {
	for (const ruleFile of ruleFiles) {
		const ruleName = path.basename(ruleFile, '.js');
		const documentPath = path.join('docs/rules', `${ruleName}.md`);
		const documentContents = fs.readFileSync(documentPath, 'utf8');

		// Check for examples.
		if (!RULES_WITHOUT_PASS_FAIL_SECTIONS.has(ruleName)) {
			t.true(documentContents.includes('## Pass'), `${ruleName} includes '## Pass' examples section`);
			t.true(documentContents.includes('## Fail'), `${ruleName} includes '## Fail' examples section`);
		}
	}
});

test('Plugin should have metadata', t => {
	t.expect(typeof eslintPluginUnicorn.meta.name, 'string');
	t.expect(typeof eslintPluginUnicorn.meta.version, 'string');
});
