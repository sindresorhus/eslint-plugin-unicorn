import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {codeFrameColumns} from '@babel/code-frame';
import eslintExperimentalApis from 'eslint/use-at-your-own-risk';
import chalk from 'chalk';
import {outdent} from 'outdent';
import babelParser from '@babel/eslint-parser';
import typescriptParser from '@typescript-eslint/parser';
import vueParser from 'vue-eslint-parser';
import prettyMilliseconds from 'pretty-ms';
import eslintPluginUnicorn from '../../index.js';

const {FlatESLint} = eslintExperimentalApis;

class UnicornIntegrationTestError extends AggregateError {
	name = 'UnicornIntegrationTestError';

	constructor(project, errors) {
		super(errors, `Error thrown when linting '${project.name}' project.`);

		this.project = project;
	}
}

class UnicornEslintFatalError extends SyntaxError {
	name = 'UnicornEslintFatalError';

	constructor(message, file) {
		super(message.message);

		this.eslintMessage = message;
		this.eslintFile = file;
	}

	get codeFrame() {
		const {source, output} = this.eslintFile;
		const {line, column, message, ruleId} = this.eslintMessage;

		return codeFrameColumns(
			source ?? output,
			{start: {line, column}},
			{
				message: ruleId ? `[${ruleId}]: ${message}` : message,
				highlightCode: true,
			},
		);
	}
}

const sum = (collection, fieldName) =>
	collection.reduce((total, {[fieldName]: value}) => total + value, 0);

const patterns = ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts', 'jsx', 'tsx', 'vue'].map(extension => `**/*.${extension}`);
const basicConfigs = [
	eslintPluginUnicorn.configs['flat/all'],
	{
		rules: {
			// This rule crashing on replace string inside `jsx` or `Unicode escape sequence`
			'unicorn/string-content': 'off',
		},
	},
	{
		files: ['**/*.ts', '**/*.mts', '**/*.cts', '**/*.tsx'],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				project: [],
			},
		},
	},
	{
		files: ['**/*.vue'],
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				parser: '@typescript-eslint/parser',
				ecmaFeatures: {
					jsx: true,
				},
				project: [],
			},
		},
	},
];

function getBabelParserConfig(project) {
	return {
		languageOptions: {
			sourceType: 'module',
			parser: babelParser,
			parserOptions: {
				requireConfigFile: false,
				babelOptions: {
					babelrc: false,
					configFile: false,
					parserOpts: {
						allowReturnOutsideFunction: true,
						plugins: [
							'jsx',
							'exportDefaultFrom',
							...project.babelPlugins,
						],
					},
				},
			},
		},
	};
}

async function runEslint(project) {
	const eslintIgnoreFile = path.join(project.location, '.eslintignore');
	const ignore = fs.existsSync(eslintIgnoreFile)
		? fs.readFileSync(eslintIgnoreFile, 'utf8').split('\n').filter(line => line && !line.startsWith('#'))
		: [];

	const eslint = new FlatESLint({
		cwd: project.location,
		overrideConfigFile: true,
		overrideConfig: [
			getBabelParserConfig(project),
			...basicConfigs,
			{ignores: [...ignore, ...project.ignore]},
		],
		fix: true,
		errorOnUnmatchedPattern: false,
	});

	const startTime = process.hrtime.bigint();
	const results = await eslint.lintFiles(patterns);

	const errors = results
		.filter(file => file.fatalErrorCount > 0)
		.flatMap(
			file => file.messages
				.filter(message => message.fatal)
				.map(message => new UnicornEslintFatalError(message, file)),
		);

	if (errors.length > 0) {
		throw new UnicornIntegrationTestError(project, errors);
	}

	const errorCount = sum(results, 'errorCount');
	const warningCount = sum(results, 'warningCount');
	const fixableErrorCount = sum(results, 'fixableErrorCount');
	const fixableWarningCount = sum(results, 'fixableWarningCount');
	console.log();
	console.log(outdent`
		${chalk.green.bold.underline(`[${project.name}]`)} ${results.length} files linted:
		- error: ${chalk.gray(errorCount)}
		- warning: ${chalk.gray(warningCount)}
		- fixable error: ${chalk.gray(fixableErrorCount)}
		- fixable warning: ${chalk.gray(fixableWarningCount)}
		- duration: ${chalk.green(prettyMilliseconds(Number((process.hrtime.bigint() - startTime) / 1000n)))}
	`);
}

export default runEslint;
