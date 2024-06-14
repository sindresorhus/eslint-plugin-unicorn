import fs, {promises as fsAsync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'ava';
import eslintExperimentalApis from 'eslint/use-at-your-own-risk';
import * as eslintrc from '@eslint/eslintrc';
import eslintPluginUnicorn from '../index.js';

const {FlatESLint} = eslintExperimentalApis;

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
});

test('validate configuration', async t => {
	const results = await Promise.all(
		Object.entries(eslintPluginUnicorn.configs).filter(([name]) => name.startsWith('flat/')).map(async ([name, config]) => {
			const eslint = new FlatESLint({
				baseConfig: config,
				overrideConfigFile: true,
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
	t.is(typeof eslintPluginUnicorn.meta.name, 'string');
	t.is(typeof eslintPluginUnicorn.meta.version, 'string');
});

function getCompactConfig(config) {
	const compat = new eslintrc.FlatCompat({
		baseDirectory: process.cwd(),
		resolvePluginsRelativeTo: process.cwd(),
	});

	const result = {plugins: undefined};

	for (const part of compat.config(config)) {
		for (const [key, value] of Object.entries(part)) {
			if (key === 'languageOptions') {
				const languageOptions = {...result[key], ...value};
				// ESLint uses same `ecmaVersion` and `sourceType` as we recommended in the new configuration system
				// https://eslint.org/docs/latest/use/configure/configuration-files-new#configuration-objects
				delete languageOptions.ecmaVersion;
				delete languageOptions.sourceType;
				result[key] = languageOptions;
			} else if (key === 'plugins') {
				result[key] = undefined;
			} else {
				result[key] = value;
			}
		}
	}

	return result;
}

test('flat configs', t => {
	t.deepEqual(
		{...getCompactConfig(eslintPluginUnicorn.configs.recommended), name: 'unicorn/flat/recommended'},
		{...eslintPluginUnicorn.configs['flat/recommended'], plugins: undefined},
	);
	t.deepEqual(
		{...getCompactConfig(eslintPluginUnicorn.configs.all), name: 'unicorn/flat/all'},
		{...eslintPluginUnicorn.configs['flat/all'], plugins: undefined},
	);
});

test('rule.meta.docs.recommended should be synchronized with presets', t => {
	for (const [name, rule] of Object.entries(eslintPluginUnicorn.rules)) {
		if (deprecatedRules.includes(name)) {
			continue;
		}

		const {recommended} = rule.meta.docs;
		t.is(typeof recommended, 'boolean', `meta.docs.recommended in '${name}' rule should be a boolean.`);

		const severity = eslintPluginUnicorn.configs.recommended.rules[`unicorn/${name}`];
		if (recommended) {
			t.is(severity, 'error', `'${name}' rule should set to 'error'.`);
		} else {
			t.is(severity, 'off', `'${name}' rule should set to 'off'.`);
		}
	}
});
