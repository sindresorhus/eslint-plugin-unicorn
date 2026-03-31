#!/usr/bin/env node
import fs, {promises as fsAsync} from 'node:fs';
import process from 'node:process';
import {pathToFileURL} from 'node:url';
import enquirer from 'enquirer';
import unicorn from '../index.js';

const rules = Object.keys(unicorn.rules);
const resolveFile = file => new URL(`../${file}`, import.meta.url);

function checkFiles(ruleId) {
	const files = [
		`docs/rules/${ruleId}.md`,
		`rules/${ruleId}.js`,
		`test/${ruleId}.js`,
		`test/snapshots/${ruleId}.js.md`,
		`test/snapshots/${ruleId}.js.snap`,
	];

	for (const file of files) {
		if (fs.existsSync(resolveFile(file))) {
			throw new Error(`\`${file}\` already exists.`);
		}
	}
}

async function renameFile(source, target) {
	source = resolveFile(source);
	target = resolveFile(target);

	if (fs.existsSync(source)) {
		await fsAsync.rename(source, target);
	}
}

async function sortReadmeRuleRow(ruleId) {
	const readmeFile = resolveFile('readme.md');
	const text = await fsAsync.readFile(readmeFile, 'utf8');
	await fsAsync.writeFile(readmeFile, sortReadmeRuleRows(text, ruleId));
}

function sortReadmeRuleRows(text, ruleId) {
	const lines = text.split('\n');
	const rowPattern = /^\| \[([^\]]+)\]\(/v;
	const rowIndex = lines.findIndex(line => line.startsWith(`| [${ruleId}](`));
	if (rowIndex === -1) {
		return text;
	}

	const [row] = lines.splice(rowIndex, 1);
	const ruleRowIndexes = lines
		.map((line, index) => rowPattern.test(line) ? index : undefined)
		.filter(index => index !== undefined);

	let insertAt = lines.findIndex(line => {
		const match = line.match(rowPattern);
		return match && match[1] > ruleId;
	});
	if (insertAt === -1) {
		insertAt = ruleRowIndexes.at(-1) + 1;
	}

	lines.splice(insertAt, 0, row);
	return lines.join('\n');
}

function replaceRuleIdInRulesIndex(text, from, to) {
	const fromLine = `export {default as '${from}'} from './${from}.js';`;
	const toLine = `export {default as '${to}'} from './${to}.js';`;
	return text.replace(fromLine, toLine);
}

async function renameRule(from, to) {
	await renameFile(`docs/rules/${from}.md`, `docs/rules/${to}.md`);
	await renameFile(`rules/${from}.js`, `rules/${to}.js`);
	await renameFile(`test/${from}.js`, `test/${to}.js`);
	await renameFile(`test/snapshots/${from}.js.md`, `test/snapshots/${to}.js.md`);
	await renameFile(`test/snapshots/${from}.js.snap`, `test/snapshots/${to}.js.snap`);

	for (const file of [
		'readme.md',
		'index.js',
		'rules/index.js',
		`docs/rules/${to}.md`,
		`rules/${to}.js`,
		`test/${to}.js`,
		`test/snapshots/${to}.js.md`,
	].map(file => resolveFile(file))) {
		if (!fs.existsSync(file)) {
			continue;
		}

		// eslint-disable-next-line no-await-in-loop
		let text = await fsAsync.readFile(file, 'utf8');
		text = file.pathname.endsWith('/rules/index.js')
			? replaceRuleIdInRulesIndex(text, from, to)
			: text.replaceAll(from, to);
		// eslint-disable-next-line no-await-in-loop
		await fsAsync.writeFile(file, text);
	}

	await sortReadmeRuleRow(to);
}

const run = async () => {
	const originalRuleId = await new enquirer.AutoComplete({
		message: 'Select the rule you want rename:',
		limit: 10,
		choices: rules,
	}).run();

	const ruleId = await new enquirer.Input({
		message: 'New name:',
		initial: originalRuleId,
	}).run();

	if (!ruleId || originalRuleId === ruleId) {
		return;
	}

	if (rules.includes(ruleId)) {
		console.log(`${ruleId} already exists.`);
		return;
	}

	checkFiles(ruleId);
	await renameRule(originalRuleId, ruleId);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	await run();
}

export {
	replaceRuleIdInRulesIndex,
	sortReadmeRuleRows,
};
