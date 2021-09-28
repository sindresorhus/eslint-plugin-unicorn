import fs, {promises as fsAsync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import test from 'ava';
import {ESLint} from 'eslint';
import index from '../index.js';

const require = createRequire(import.meta.url);
let ruleFiles;

test.before(async () => {
	const files = await fsAsync.readdir('rules');
	ruleFiles = files.filter(file => path.extname(file) === '.js');
});

const ignoredRules = [
	'no-nested-ternary',
];

const deprecatedRules = Object.entries(index.rules)
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

test('Every rule is defined in index file in alphabetical order', t => {
	for (const file of ruleFiles) {
		const name = path.basename(file, '.js');
		t.truthy(index.rules[name], `'${name}' is not exported in 'index.js'`);
		if (!deprecatedRules.includes(name)) {
			t.truthy(index.configs.recommended.rules[`unicorn/${name}`], `'${name}' is not set in the recommended config`);
		}

		t.truthy(fs.existsSync(path.join('docs/rules', `${name}.md`)), `There is no documentation for '${name}'`);
		t.truthy(fs.existsSync(path.join('test', file.replace(/\.js$/, '.mjs'))), `There are no tests for '${name}'`);
	}

	t.is(
		Object.keys(index.rules).length - deprecatedRules.length,
		ruleFiles.length,
		'There are more exported rules than rule files.',
	);
	t.is(
		Object.keys(index.configs.recommended.rules).length - deprecatedRules.length - ignoredRules.length,
		ruleFiles.length - deprecatedRules.length,
		'There are more exported rules in the recommended config than rule files.',
	);
	t.is(
		Object.keys(index.configs.all.rules).length - deprecatedRules.length - ignoredRules.length,
		ruleFiles.length - deprecatedRules.length,
		'There are more rules than those exported in the all config.',
	);

	testSorted(t, Object.keys(index.configs.recommended.rules), 'configs.recommended.rules');
});

test('validate configuration', async t => {
	const results = [];
	for (const config of Object.keys(index.configs)) {
		results.push(t.notThrowsAsync(
			new ESLint({
				overrideConfigFile: './configs/' + config + '.js',
				plugins: {
					unicorn: require('../index.js'),
				},
			}).lintText(''),
			`Configuration file for "${config}" is invalid at "./configs/${config}.js"`,
		));
	}

	await Promise.all(results);
});

test('Every rule is defined in readme.md usage and list of rules in alphabetical order', async t => {
	const readme = await fsAsync.readFile('readme.md', 'utf8');
	let usageRules;
	try {
		const usageRulesMatch = /<!-- USAGE_EXAMPLE_START -->.*?"rules": (?<rules>{.*?}).*?<!-- USAGE_EXAMPLE_END -->/ms.exec(readme);
		t.truthy(usageRulesMatch, 'List of rules should be defined in readme.md ## Usage');
		usageRules = JSON.parse(usageRulesMatch.groups.rules);
	} catch {}

	t.truthy(usageRules, 'List of rules should be defined in readme.md ## Usage and be valid JSON');

	const rulesMatch = /<!-- RULES_TABLE_START -->(?<rulesText>.*?)<!-- RULES_TABLE_END -->/ms.exec(readme);
	t.truthy(rulesMatch, 'List of rules should be defined in readme.md in ## Rules before ## Recommended config');
	const {rulesText} = rulesMatch.groups;
	const re = /\| \[(?<id>.*?)]\((?<link>.*?)\) \| (?<description>.*) \| (?<recommended>.*?) \| (?<fixable>.*?) \| (?<hasSuggestions>.*?)\n/gm;
	const rules = [];
	let match;
	do {
		match = re.exec(rulesText);
		if (match) {
			const {id, link, description} = match.groups;
			t.is(link, `docs/rules/${id}.md`, `${id} link to docs should be correct`);
			t.true(description.trim().length > 0, `${id} should have description in readme.md ## Rules`);
			rules.push(id);
		}
	} while (match);

	const availableRules = ruleFiles
		.map(file => path.basename(file, '.js'))
		.filter(name => !deprecatedRules.includes(name));

	for (const name of availableRules) {
		t.truthy(usageRules[`unicorn/${name}`], `'${name}' is not described in the readme.md ## Usage`);
		t.truthy(rules.includes(name), `'${name}' is not described in the readme.md ## Rules`);
	}

	t.is(Object.keys(usageRules).length - ignoredRules.length, availableRules.length, 'There are more rules in readme.md ## Usage than rule files.');
	t.is(Object.keys(rules).length, availableRules.length, 'There are more rules in readme.md ## Rules than rule files.');

	testSorted(t, Object.keys(usageRules), 'readme.md ## Usage rules');
	testSorted(t, rules, 'readme.md ## Rules');
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

test('Every deprecated rules listed in docs/deprecated-rules.md', async t => {
	const content = await fsAsync.readFile('docs/deprecated-rules.md', 'utf8');
	const rulesInMarkdown = content.match(/(?<=^## ).*?$/gm);
	t.deepEqual(deprecatedRules, rulesInMarkdown);

	for (const name of deprecatedRules) {
		const rule = index.rules[name];
		t.is(typeof rule.create, 'function', `${name} create is not function`);
		t.deepEqual(rule.create(), {}, `${name} create should return empty object`);
		t.true(rule.meta.deprecated, `${name} meta.deprecated should be true`);
	}
});
