#!/usr/bin/env node
'use strict';
const path = require('path');
const Listr = require('listr');
const tempy = require('tempy');
const execa = require('execa');
const del = require('del');
const chalk = require('chalk');
const {isCI} = require('ci-info');

const typescriptArguments = ['--parser', '@typescript-eslint/parser', '--ext', '.ts'];
const vueArguments = ['--parser', 'vue-eslint-parser', '--ext', '.vue'];

const projects = [
	'https://github.com/avajs/ava',
	'https://github.com/chalk/chalk',
	'https://github.com/chalk/wrap-ansi',
	'https://github.com/sindresorhus/np',
	'https://github.com/sindresorhus/ora',
	'https://github.com/sindresorhus/p-map',
	'https://github.com/sindresorhus/os-locale',
	'https://github.com/sindresorhus/execa',
	'https://github.com/sindresorhus/pify',
	'https://github.com/sindresorhus/boxen',
	'https://github.com/sindresorhus/make-dir',
	'http://github.com/SamVerschueren/listr',
	'http://github.com/SamVerschueren/listr-update-renderer',
	'http://github.com/SamVerschueren/clinton',
	'http://github.com/SamVerschueren/bragg',
	'http://github.com/SamVerschueren/bragg-router',
	'http://github.com/SamVerschueren/dev-time',
	'https://github.com/SamVerschueren/decode-uri-component',
	'https://github.com/kevva/to-ico',
	'https://github.com/kevva/download',
	'https://github.com/kevva/brightness',
	'https://github.com/kevva/decompress',
	'https://github.com/kevva/npm-conf',
	'https://github.com/imagemin/imagemin',
	'https://github.com/qix-/color-convert',
	'https://github.com/sindresorhus/ky',
	'https://github.com/sindresorhus/query-string',
	'https://github.com/sindresorhus/meow',
	'https://github.com/sindresorhus/globby',
	'https://github.com/sindresorhus/emittery',
	{
		repository: 'https://github.com/sindresorhus/p-queue',
		extraArguments: typescriptArguments
	},
	'https://github.com/sindresorhus/pretty-bytes',
	'https://github.com/sindresorhus/normalize-url',
	{
		repository: 'https://github.com/sindresorhus/pageres',
		extraArguments: typescriptArguments
	},
	{
		repository: 'https://github.com/sindresorhus/got',
		extraArguments: typescriptArguments
	},
	// TODO: Add this project when #561 got fixed
	// {
	// 	repository: 'https://github.com/eslint/eslint',
	// 	path: 'lib'
	// },
	{
		repository: 'https://github.com/prettier/prettier',
		path: 'src'
	},
	{
		repository: 'https://github.com/facebook/react',
		path: 'packages'
	},
	{
		repository: 'https://github.com/angular/angular',
		path: 'packages',
		extraArguments: typescriptArguments
	},
	{
		repository: 'https://github.com/microsoft/typescript',
		path: 'src',
		extraArguments: typescriptArguments
	},
	// TODO: Add this project when `@typescript-eslint/parser` support `Type-Only Imports and Export`
	// {
	// 	repository: 'https://github.com/microsoft/vscode',
	// 	path: 'src/vs',
	// 	extraArguments: typescriptArguments
	// },
	{
		repository: 'https://github.com/ElemeFE/element',
		path: 'packages',
		extraArguments: vueArguments
	},
	{
		repository: 'https://github.com/iview/iview',
		path: 'src',
		extraArguments: vueArguments
	},
	'https://github.com/sindresorhus/create-dmg',
	'https://github.com/sindresorhus/cp-file',
	'https://github.com/sindresorhus/capture-website',
	'https://github.com/sindresorhus/file-type',
	'https://github.com/sindresorhus/slugify',
	// TODO: add this project when #254 got fixed
	// https://github.com/gatsbyjs/gatsby/blob/e720d8efe58eba0f6fae9f26ec8879128967d0b5/packages/gatsby/src/bootstrap/page-hot-reloader.js#L30
	// 'https://github.com/gatsbyjs/gatsby',
	{
		repository: 'https://github.com/puppeteer/puppeteer',
		path: 'lib'
	},
	{
		repository: 'https://github.com/zeit/next.js',
		path: 'packages',
		extraArguments: typescriptArguments
	},
	'https://github.com/chakra-ui/chakra-ui',
	'https://github.com/ReactTraining/react-router',
	'https://github.com/mozilla/pdf.js'
].map(project => {
	if (typeof project === 'string') {
		project = {repository: project};
	}

	const {
		repository,
		name = repository.split('/').pop(),
		path = '',
		extraArguments = []
	} = project;

	return {
		...project,
		name,
		repository,
		path,
		extraArguments
	};
});

const cwd = path.join(__dirname, 'eslint-config-unicorn-tester');

const enrichErrors = (packageName, cliArguments, f) => async (...arguments_) => {
	try {
		return await f(...arguments_);
	} catch (error) {
		error.packageName = packageName;
		error.cliArgs = cliArguments;
		throw error;
	}
};

const makeEslintTask = (project, destination, extraArguments = []) => {
	const arguments_ = [
		'eslint',
		'--no-eslintrc',
		'--format',
		'json',
		'--config',
		path.join(cwd, 'index.js'),
		project.path ? path.join(destination, project.path) : destination,
		...project.extraArguments,
		...extraArguments
	];

	return enrichErrors(project.name, arguments_, async () => {
		let stdout;
		let processError;
		try {
			({stdout} = await execa('npx', arguments_, {cwd, localDir: __dirname}));
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
	const destination = tempy.directory();

	return new Listr([
		{
			title: 'Cloning',
			task: () => execa('git', ['clone', project.repository, '--single-branch', destination])
		},
		{
			title: 'Running eslint',
			task: makeEslintTask(project, destination)
		},
		{
			title: 'Running eslint --fix',
			task: makeEslintTask(project, destination, ['--fix-dry-run'])
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
		task: () => execa('npm', ['install'], {cwd})
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
