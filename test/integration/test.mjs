#!/usr/bin/env node
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import Listr from 'listr';
import execa from 'execa';
import chalk from 'chalk';
import {isCI} from 'ci-info';
import mem from 'mem';
import allProjects from './projects.mjs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectsArguments = process.argv.slice(2);
const projects = projectsArguments.length === 0
	? allProjects
	: allProjects.filter(({name}) => projectsArguments.includes(name));

const enrichErrors = (packageName, cliArguments, f) => async (...arguments_) => {
	try {
		return await f(...arguments_);
	} catch (error) {
		error.packageName = packageName;
		error.cliArgs = cliArguments;
		throw error;
	}
};

const makeEslintTask = (project, destination) => {
	const arguments_ = [
		'eslint',
		project.path || '.',
		'--fix-dry-run',
		'--no-eslintrc',
		'--ext',
		'.js,.ts,.vue',
		'--format',
		'json',
		'--config',
		path.join(dirname, 'config.js'),
	];

	for (const pattern of project.ignore) {
		arguments_.push('--ignore-pattern', pattern);
	}

	return enrichErrors(project.name, arguments_, async () => {
		let stdout;
		let processError;
		try {
			({stdout} = await execa('npx', arguments_, {cwd: destination, localDir: dirname}));
		} catch (error) {
			({stdout} = error);
			processError = error;

			if (!stdout) {
				throw error;
			}
		}

		let files;
		try {
			files = JSON.parse(stdout);
		} catch (error) {
			console.error('Error while parsing eslint output:', error);

			if (processError) {
				throw processError;
			}

			throw error;
		}

		for (const file of files) {
			for (const message of file.messages) {
				if (message.fatal) {
					const error = new Error(message.message);
					error.eslintJob = {
						destination,
						project,
						file,
					};
					error.eslintMessage = message;
					throw error;
				}
			}
		}
	});
};

const getBranch = mem(async dirname => (await execa('git', ['branch', '--show-current'], {cwd: dirname})).stdout);

const execute = project => {
	const destination = project.location || path.join(dirname, 'fixtures', project.name);

	return new Listr([
		{
			title: 'Cloning',
			skip: () => fs.existsSync(destination) ? 'Project already downloaded.' : false,
			task: () => execa('git', [
				'clone',
				project.repository,
				'--single-branch',
				'--depth',
				'1',
				destination,
			]),
		},
		{
			title: 'Running eslint',
			task: makeEslintTask(project, destination),
		},
	].map(({title, task, skip}) => ({
		title: `${project.name} / ${title}`,
		skip,
		task,
	})), {
		exitOnError: false,
	});
};

const list = new Listr([
	{
		title: 'Setup',
		task: () => execa('npm', ['install'], {cwd: dirname}),
	},
	{
		title: 'Integration tests',
		task: () => {
			const tests = new Listr({concurrent: true});

			for (const project of projects) {
				tests.add([
					{
						title: project.name,
						task: () => execute(project),
					},
				]);
			}

			return tests;
		},
	},
], {
	renderer: isCI ? 'verbose' : 'default',
});

list.run()
	.catch(async error => {
		if (error.errors) {
			for (const error2 of error.errors) {
				console.error('\n', chalk.red.bold.underline(error2.packageName), chalk.gray('(' + error2.cliArgs.join(' ') + ')'));
				console.error(error2.message);

				if (error2.stderr) {
					console.error(chalk.gray(error2.stderr));
				}

				if (error2.eslintMessage) {
					const {file, project, destination} = error2.eslintJob;
					const {line} = error2.eslintMessage;

					if (project.repository) {
						// eslint-disable-next-line no-await-in-loop
						const branch = await getBranch(destination);
						console.error(chalk.gray(`${project.repository}/blob/${branch}/${path.relative(destination, file.filePath)}#L${line}`));
					} else {
						console.error(chalk.gray(`${path.relative(destination, file.filePath)}#L${line}`));
					}

					console.error(chalk.gray(JSON.stringify(error2.eslintMessage, undefined, 2)));
				}
			}
		} else {
			console.error(error);
		}

		process.exit(1);
	})
	// Catch errors in last `.catch`
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
