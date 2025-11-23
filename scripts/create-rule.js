#!/usr/bin/env node
import fs from 'node:fs';
import enquirer from 'enquirer';
import openEditor from 'open-editor';
import spawn from 'nano-spawn';
import styleText from 'node-style-text';

const PROJECT_ROOT = new URL('../', import.meta.url);
const TEMPLATE_DIRECTORY = new URL('template/', import.meta.url);

function checkFiles(ruleId) {
	const files = [
		`docs/rules/${ruleId}.md`,
		`rules/${ruleId}.js`,
		`test/${ruleId}.js`,
		`test/snapshots/${ruleId}.js.md`,
		`test/snapshots/${ruleId}.js.snap`,
	];

	for (const file of files) {
		if (fs.existsSync(new URL(file, PROJECT_ROOT))) {
			throw new Error(`“${file}” already exists.`);
		}
	}
}

async function renderTemplate({source, target}, data) {
	const sourceUrl = new URL(source, TEMPLATE_DIRECTORY);
	const targetUrl = new URL(target, PROJECT_ROOT);

	if (source.endsWith('.template.txt')) {
		await fs.promises.copyFile(sourceUrl, targetUrl);
	} else if (source.endsWith('.template.js')) {
		const {default: render} = await import(new URL(source, TEMPLATE_DIRECTORY));
		const content = render(data);
		await fs.promises.writeFile(targetUrl, content);
	} else {
		throw new Error(`Unknown template file '${source}'.`);
	}

	console.log(`File ${styleText.underline.blue(target)} created.`);

	return target;
}

async function getData() {
	const questions = [
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
			},
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
			},
		},
		{
			type: 'select',
			name: 'fixableType',
			message: 'Is it fixable?',
			choices: ['Code', 'Whitespace', 'No'],
			result: value => value === 'No' ? false : value.toLowerCase(),
		},
		{
			type: 'select',
			name: 'type',
			message: 'Type:',
			choices: [
				'problem',
				'suggestion',
				'layout',
			],
		},
		{
			type: 'select',
			name: 'hasSuggestions',
			message: 'Does it provides suggestions?',
			choices: ['Yes', 'No'],
			result: value => value === 'Yes',
		},
	];

	const data = await enquirer.prompt(questions);

	return data;
}

const data = await getData();
const {id} = data;

checkFiles(id);

const files = await Promise.all(
	[
		{
			source: 'documentation.md.template.txt',
			target: `docs/rules/${id}.md`,
		},
		{
			source: 'rule.js.template.js',
			target: `rules/${id}.js`,
		},
		{
			source: 'test.js.template.txt',
			target: `test/${id}.js`,
		},
	].map(template => renderTemplate(template, data)),
);

const shouldOpenFiles = await enquirer.prompt({
	type: 'confirm',
	message: 'Open files in editor?',
	initial: true,
});

if (shouldOpenFiles) {
	try {
		await openEditor(files.map(file => new URL(file, PROJECT_ROOT)));
	} catch {
		// https://github.com/sindresorhus/open-editor/issues/15
		try {
			await spawn('code', [
				'--new-window',
				'.',
				...files,
			], {cwd: PROJECT_ROOT});
		} catch {}
	}
}
