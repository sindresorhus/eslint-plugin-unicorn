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

const ignoredRules = [
	'no-nested-ternary'
];

const deprecatedRules = [
	'prefer-exponentiation-operator'
];

const testSorted = (t, actualOrder, sourceName) => {
	actualOrder = actualOrder.filter(x => !ignoredRules.includes(x));
	const sortedOrder = actualOrder.slice(0).sort();

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
		t.truthy(fs.existsSync(path.join('test', file)), `There are no tests for '${name}'`);
	}

	t.is(
		Object.keys(index.rules).length,
		ruleFiles.length,
		'There are more exported rules than rule files.'
	);
	t.is(
		Object.keys(index.configs.recommended.rules).length - ignoredRules.length,
		ruleFiles.length - deprecatedRules.length,
		'There are more exported rules in the recommended config than rule files.'
	);

	testSorted(t, Object.keys(index.configs.recommended.rules), 'configs.recommended.rules');
});

test('Every rule is defined in readme.md usage and list of rules in alphabetical order', async t => {
	const readme = await pify(fs.readFile)('readme.md', 'utf8');
	let usageRules;
	try {
		const usageRulesMatch = /## Usage.*?"rules": ({.*?})/ms.exec(readme);
		t.truthy(usageRulesMatch, 'List of rules should be defined in readme.md ## Usage');
		usageRules = JSON.parse(usageRulesMatch[1]);
	} catch (_) {}

	t.truthy(usageRules, 'List of rules should be defined in readme.md ## Usage and be valid JSON');

	const rulesMatch = /## Rules(.*?)## Deprecated Rules/ms.exec(readme);
	t.truthy(rulesMatch, 'List of rules should be defined in readme.md in ## Rules before ## Recommended config');
	const rulesText = rulesMatch[1];
	const re = /- \[(.*?)]\((.*?)\) - (.*)\n/gm;
	const rules = [];
	let match;
	do {
		match = re.exec(rulesText);
		if (match) {
			t.is(match[2], `docs/rules/${match[1]}.md`, `${match[1]} link to docs should be correct`);
			t.true(match[3].trim().length > 0, `${match[1]} should have description in readme.md ## Rules`);
			rules.push(match[1]);
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
