#!/usr/bin/env node
'use strict';
const path = require('path');
const Listr = require('listr');
const execa = require('execa');
const del = require('del');
const chalk = require('chalk');
const {isCI} = require('ci-info');
const projects = require('./projects');

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
		'--fix-dry-run',
		'--no-eslintrc',
		// https://github.com/microsoft/TypeScript/blob/a1c8608f681488fda3f0b6ffd89195a81f80f0b0/.eslintignore#L6
		project.name === 'typescript' ? '' : '--no-ignore',
		'--format',
		'json',
		'--config',
		path.join(__dirname, 'config.js'),
		project.path ? path.join(destination, project.path) : destination,
		...project.extraArguments
	].filter(Boolean);

	return enrichErrors(project.name, arguments_, async () => {
		let stdout;
		let processError;
		try {
			({stdout} = await execa('npx', arguments_, {cwd: destination, localDir: __dirname}));
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
					error.eslintFile = file;
					error.eslintMessage = message;
					throw error;
				}
			}
		}
	});
};

const execute = project => {
	const destination = path.join(__dirname, 'fixtures', project.name);

	return new Listr([
		{
			title: 'Cloning',
			task: () => execa('git', [
				'clone',
				project.repository,
				'--single-branch',
				'--depth',
				'1',
				destination
			])
		},
		{
			title: 'Running eslint',
			task: makeEslintTask(project, destination)
		},
		{
			title: 'Clean up',
			task: () => del(destination, {force: true})
		}
	].map(({title, task}) => ({
		title: `${project.name} / ${title}`,
		task
	})), {
		exitOnError: false
	});
};

const list = new Listr([
	{
		title: 'Setup',
		task: () => execa('npm', ['install'], {cwd: __dirname})
	},
	{
		title: 'Integration tests',
		task: () => {
			const tests = new Listr({concurrent: true});

			for (const project of projects) {
				tests.add([
					{
						title: project.name,
						task: () => execute(project)
					}
				]);
			}

			return tests;
		}
	}
], {
	renderer: isCI ? 'verbose' : 'default'
});

list.run()
	.catch(error => {
		if (error.errors) {
			for (const error2 of error.errors) {
				console.error('\n', chalk.red.bold.underline(error2.packageName), chalk.gray('(' + error2.cliArgs.join(' ') + ')'));
				console.error(error2.message);

				if (error2.stderr) {
					console.error(chalk.gray(error2.stderr));
				}

				if (error2.eslintMessage) {
					console.error(chalk.gray(error2.eslintFile.filePath), chalk.gray(JSON.stringify(error2.eslintMessage, null, 2)));
				}
			}
		} else {
			console.error(error);
		}

		process.exit(1);
	});
