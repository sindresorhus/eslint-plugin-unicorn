#!/usr/bin/env node
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {Listr} from 'listr2';
import spawn from 'nano-spawn';
import styleText from 'node-style-text';
import {outdent} from 'outdent';
import {isCI} from 'ci-info';
import memoize from 'memoize';
import YAML from 'yaml';
import allProjects from './projects.js';
import runEslint from './run-eslint.js';

if (isCI) {
	const CI_CONFIG_FILE = new URL('../../.github/workflows/main.yml', import.meta.url);
	const content = fs.readFileSync(CI_CONFIG_FILE, 'utf-8');
	const config = YAML.parse(content).jobs.integration.strategy.matrix.group;

	const expected = [...new Set(allProjects.map(project => String(project.group + 1)))];
	if (
		config.length !== expected.length
		|| expected.some((group, index) => config[index] !== group)
	) {
		throw new Error(outdent`
			Expect 'jobs.integration.strategy.matrix.group' in '/.github/workflows/main.yml' to be:
			${YAML.stringify(expected)}
		`);
	}
}

const {
	values: {
		group,
	},
	positionals: projectsArguments,
} = parseArgs({
	options: {
		group: {
			type: 'string',
		},
	},
	allowPositionals: true,
});

let projects = projectsArguments.length === 0
	? allProjects
	: allProjects.filter(({name}) => projectsArguments.includes(name));

if (isCI && !group) {
	throw new Error('"--group" is required');
}

if (group) {
	projects = projects.filter(project => String(project.group + 1) === group);
}

if (projects.length === 0) {
	console.log('No project matched');
	process.exit(0);
}

const getBranch = memoize(async dirname => {
	const {stdout} = await spawn('git', ['branch', '--show-current'], {cwd: dirname});
	return stdout;
});

const execute = project => new Listr(
	[
		{
			title: 'Cloning',
			skip: () => fs.existsSync(project.location) ? 'Project already downloaded.' : false,
			task: () => spawn('git', [
				'clone',
				project.repository,
				'--single-branch',
				'--depth',
				'1',
				project.location,
			], {stdout: 'inherit', stderr: 'inherit'}),
		},
		{
			title: 'Running eslint',
			task: () => runEslint(project),
		},
	].map(({title, task, skip}) => ({
		title: `${project.name} / ${title}`,
		skip,
		task,
	})),
	{exitOnError: false},
);

async function printEslintError(eslintError) {
	const {message, project} = eslintError;

	console.log();
	console.error(
		styleText.red.bold.underline(`[${project.name}]`),
		message,
	);

	project.branch ??= await getBranch(project.location);
	for (const error of eslintError.errors) {
		let file = path.relative(project.location, error.eslintFile.filePath);
		if (project.repository) {
			file = `${project.repository}/blob/${project.branch}/${file}`;
		}

		if (typeof error.eslintMessage.line === 'number') {
			file += `#L${error.eslintMessage.line}`;
		}

		console.log();
		console.error(styleText.blue.bold.underline(file));
		console.log();
		console.error(error.codeFrame);
	}
}

async function printListrError(listrError) {
	process.exitCode = 1;

	if (!listrError.errors) {
		console.error(listrError);
		return;
	}

	for (const error of listrError.errors) {
		if (error.name !== 'UnicornIntegrationTestError') {
			console.error(error);
			continue;
		}

		// eslint-disable-next-line no-await-in-loop
		await printEslintError(error);
	}
}

try {
	await new Listr(
		projects.map(project => ({title: project.name, task: () => execute(project)})),
		{
			renderer: isCI ? 'verbose' : 'default',
			concurrent: true,
		},
	).run();
} catch (error) {
	await printListrError(error);
}
