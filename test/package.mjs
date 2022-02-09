import fs, {promises as fsAsync} from 'node:fs';
import path from 'node:path';
import test from 'ava';
import {ESLint} from 'eslint';
import eslintPluginUnicorn from '../index.js';
import {RULE_NOTICE_MARK, getRuleNoticesSectionBody} from '../scripts/rule-notices.mjs';
import {RULES_TABLE_MARK, getRulesTable} from '../scripts/rules-table.mjs';
import ruleDescriptionToDocumentTitle from './utils/rule-description-to-document-title.mjs';

let ruleFiles;

test.before(async () => {
	const files = await fsAsync.readdir('rules');
	ruleFiles = files.filter(file => path.extname(file) === '.js');
});

const ignoredRules = [
	'no-nested-ternary',
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

/**
Get list of named options from a JSON schema (used for rule schemas).

@param {object | Array} jsonSchema - The JSON schema to check.
@returns {string[]} A list of named options.
*/
function getNamedOptions(jsonSchema) {
	if (!jsonSchema) {
		return [];
	}

	if (Array.isArray(jsonSchema)) {
		return jsonSchema.flatMap(item => getNamedOptions(item));
	}

	if (jsonSchema.items) {
		return getNamedOptions(jsonSchema.items);
	}

	if (jsonSchema.properties) {
		return Object.keys(jsonSchema.properties);
	}

	return [];
}

const RULES_WITHOUT_PASS_FAIL_SECTIONS = new Set([
	'filename-case', // Doesn't show code samples since it's just focused on filenames.
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
		const testObjects = [
			'undefinedGlobalObject',
			// `es2015`(`es6`) globals https://github.com/eslint/eslint/blob/32ac37a76b2e009a8f106229bc7732671d358189/conf/globals.js#L74
			'Promise',
			// `es2021` globals https://github.com/eslint/eslint/blob/32ac37a76b2e009a8f106229bc7732671d358189/conf/globals.js#L120
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

		t.deepEqual(await getUndefinedGlobals(), testObjects);
		t.deepEqual(await getUndefinedGlobals({baseConfig: eslintPluginUnicorn.configs.recommended}), testObjects.slice(0, 1));
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

test('Every rule is defined in readme.md usage and list of rules in alphabetical order', async t => {
	const readme = await fsAsync.readFile('readme.md', 'utf8');

	const lines = readme.split('\n');
	const startMarkLine = lines.indexOf(RULES_TABLE_MARK.start);
	t.not(
		startMarkLine,
		-1,
		'missing rules table start mark',
	);
	const endMarkLine = lines.indexOf(RULES_TABLE_MARK.end);
	t.not(
		endMarkLine,
		-1,
		'missing rules table end mark',
	);
	const table = lines.slice(startMarkLine - 1, endMarkLine + 1).join('\n');
	t.is(
		table,
		[
			RULES_TABLE_MARK.comment,
			RULES_TABLE_MARK.start,
			getRulesTable(),
			RULES_TABLE_MARK.end,
		].join('\n'),
		'rules table should have correct content',
	);

	const re = /\| \[(?<id>.*?)]\((?<link>.*?)\) \| (?<description>.*) \| (?<recommended>.*?) \| (?<fixable>.*?) \| (?<hasSuggestions>.*?)\n/gm;
	const rules = [];
	let match;
	do {
		match = re.exec(table);
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
		t.truthy(rules.includes(name), `'${name}' is not described in the readme.md ## Rules`);
	}

	t.is(Object.keys(rules).length, availableRules.length, 'There are more rules in readme.md ## Rules than rule files.');

	testSorted(t, rules, 'readme.md ## Rules');
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
		const rule = eslintPluginUnicorn.rules[ruleName];
		const documentPath = path.join('docs/rules', `${ruleName}.md`);
		const documentContents = fs.readFileSync(documentPath, 'utf8');
		const documentLines = documentContents.split('\n');

		// Check title.
		const expectedTitle = `# ${ruleDescriptionToDocumentTitle(rule.meta.docs.description)}`;
		t.is(documentLines[0], expectedTitle, `${ruleName} includes the rule description in title`);

		// Check for examples.
		if (!RULES_WITHOUT_PASS_FAIL_SECTIONS.has(ruleName)) {
			t.true(documentContents.includes('## Pass'), `${ruleName} includes '## Pass' examples section`);
			t.true(documentContents.includes('## Fail'), `${ruleName} includes '## Fail' examples section`);
		}

		// Check if the rule has configuration options.
		if (
			(Array.isArray(rule.meta.schema) && rule.meta.schema.length > 0)
			|| (typeof rule.meta.schema === 'object' && Object.keys(rule.meta.schema).length > 0)
		) {
			// Should have an options section header:
			t.true(documentContents.includes('## Options'), `${ruleName} should have an "## Options" section`);

			// Ensure all configuration options are mentioned.
			for (const namedOption of getNamedOptions(rule.meta.schema)) {
				t.true(documentContents.includes(namedOption), `${ruleName} should mention the \`${namedOption}\` option`);
			}
		} else {
			// Should NOT have any options/config section headers:
			t.false(documentContents.includes('# Options'), `${ruleName} should not have an "Options" section`);
			t.false(documentContents.includes('# Config'), `${ruleName} should not have a "Config" section`);
		}

		// Ensure that expected notices are present in the correct order.
		t.is(
			documentLines[1],
			'',
			`${ruleName} should has blank line before notice`,
		);
		const startMarkLine = 3;
		t.is(
			documentLines[startMarkLine],
			RULE_NOTICE_MARK.start,
			`${ruleName} missing rule notice start mark`,
		);
		const endMarkLine = documentLines.indexOf(RULE_NOTICE_MARK.end);
		t.not(
			endMarkLine,
			-1,
			`${ruleName} missing rule notice end mark`,
		);
		const notices = documentLines.slice(startMarkLine - 1, endMarkLine + 1).join('\n');
		t.is(
			notices,
			[
				RULE_NOTICE_MARK.comment,
				RULE_NOTICE_MARK.start,
				getRuleNoticesSectionBody(ruleName),
				RULE_NOTICE_MARK.end,
			].filter(Boolean).join('\n'),
			`${ruleName} should have expected notice(s)`,
		);
	}
});
