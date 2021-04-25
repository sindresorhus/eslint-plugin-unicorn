#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import enquirer from 'enquirer';
import {template} from 'lodash-es';
import execa from 'execa';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(dirname, '..');

function checkFiles(ruleId) {
	const files = [
		`docs/rules/${ruleId}.md`,
		`rules/${ruleId}.js`,
		`test/${ruleId}.mjs`
	];

	for (const file of files) {
		if (fs.existsSync(path.join(ROOT, file))) {
			throw new Error(`“${file}” already exists.`);
		}
	}
}

function renderTemplate({source, target, data}) {
	const templateFile = path.join(dirname, `template/${source}`);
	const targetFile = path.join(ROOT, target);
	const templateContent = fs.readFileSync(templateFile, 'utf8');

	const compiled = template(templateContent);
	const content = compiled(data);
	return fs.writeFileSync(targetFile, content);
}

function updateIndex(id) {
	const RULE_START = '\t\t\trules: {\n';
	const RULE_END = '\n\t\t\t}';
	const RULE_INDENT = '\t'.repeat(4);
	let ruleContent = `${RULE_INDENT}'unicorn/${id}': 'error',`;

	const file = path.join(ROOT, 'index.js');
	const content = fs.readFileSync(file, 'utf8');
	const [before, rest] = content.split(RULE_START);
	const [rules, after] = rest.split(RULE_END);

	const lines = rules.split('\n');
	if (!lines.every(line => line.startsWith(RULE_INDENT))) {
		throw new Error('Unexpected content in “index.js”.');
	}

	const unicornRuleLines = lines.filter(line => line.startsWith(`${RULE_INDENT}'unicorn/`));
	let insertIndex;
	if (ruleContent.localeCompare(unicornRuleLines[0]) === -1) {
		insertIndex = 0;
	} else if (ruleContent.localeCompare(unicornRuleLines[unicornRuleLines.length - 1]) === 1) {
		insertIndex = lines.length;
		lines[lines.length - 1] += ',';
		ruleContent = ruleContent.slice(0, -1);
	} else {
		const lineBefore = unicornRuleLines[
			unicornRuleLines.findIndex(line => line.localeCompare(ruleContent) === 1) - 1
		];
		insertIndex = lines.indexOf(lineBefore) + 1;
	}

	lines.splice(insertIndex, 0, ruleContent);

	const updated = `${before}${RULE_START}${lines.join('\n')}${RULE_END}${after}`;
	fs.writeFileSync(file, updated);
}

(async () => {
	const data = await enquirer.prompt([
		{
			type: 'input',
			name: 'id',
			message: 'Rule name:',
			validate(value) {
				if (!value) {
					return 'Rule name is required.';
				}

				if (!/^[a-z-]+$/.test(value)) {
					return 'Invalid rule name.';
				}

				return true;
			}
		},
		{
			type: 'input',
			name: 'description',
			message: 'Rule description:',
			validate(value) {
				if (!value) {
					return 'Rule description is required.';
				}

				return true;
			}
		},
		{
			type: 'select',
			name: 'fixableType',
			message: 'Is it fixable?',
			choices: [
				{
					message: 'Code',
					value: 'code'
				},
				{
					message: 'Whitespace',
					value: 'whitespace'
				},
				{
					message: 'No',
					value: ''
				}
			]
		},
		{
			type: 'select',
			name: 'type',
			message: 'Type:',
			choices: [
				'problem',
				'suggestion',
				'layout'
			]
		}
	]);

	const {id} = data;

	checkFiles(id);
	renderTemplate({
		source: 'documentation.md.jst',
		target: `docs/rules/${id}.md`,
		data
	});
	renderTemplate({
		source: 'rule.js.jst',
		target: `rules/${id}.js`,
		data
	});
	renderTemplate({
		source: 'test.mjs.jst',
		target: `test/${id}.mjs`,
		data
	});
	updateIndex(id);

	try {
		await execa('code', [
			'--new-window',
			'.',
			`docs/rules/${id}.md`,
			`rules/${id}.js`,
			`test/${id}.mjs`
		], {cwd: ROOT});
	} catch {}
})().catch(error => {
	console.error(error);
	process.exit(1);
});
