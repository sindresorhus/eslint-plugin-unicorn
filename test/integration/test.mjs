#!/usr/bin/env node
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import Listr from 'listr';
import {execa} from 'execa';
import chalk from 'chalk';
import {isCI} from 'ci-info';
import mem from 'mem';
import allProjects from './projects.mjs';
import runEslint from './run-eslint.mjs';

const projectsArguments = process.argv.slice(2);
const projects = projectsArguments.length === 0
	? allProjects
	: allProjects.filter(({name}) => projectsArguments.includes(name));

const getBranch = mem(async dirname => {
	const {stdout} = await execa('git', ['branch', '--show-current'], {cwd: dirname});
	return stdout;
});

const execute = project => new Listr(
	[
		{
			title: 'Cloning',
			skip: () => fs.existsSync(project.location) ? 'Project already downloaded.' : false,
			task: () => execa('git', [
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
		chalk.red.bold.underline(`[${project.name}]`),
		message,
	);

	project.branch ??= await getBranch(project.location);
	for (const error of eslintError.errors) {
		let file = path.relative(project.location, error.eslintFile.filePath);
		if (project.repository) {
			file = `${project.repository}/blob/${project.branch}/${file}`;
		}

		if (typeof error.eslintMessage.line == 'number') {
			file += `#L${error.eslintMessage.line}`;
		}
		console.log();
		console.error(chalk.blue.bold.underline(file));
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
		{renderer: 'verbose'},
	).run();
} catch (error) {
	await printListrError(error);
}
