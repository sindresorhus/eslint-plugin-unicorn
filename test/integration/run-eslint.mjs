import {codeFrameColumns} from '@babel/code-frame';
import {ESLint} from 'eslint';
import chalk from 'chalk';
import {outdent} from 'outdent';
import eslintPluginUnicorn from '../../index.js';

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
		const {line, column, message} = this.eslintMessage;

		return codeFrameColumns(
			source ?? output,
			{start: {line, column}},
			{message, highlightCode: true},
		);
	}
}

const sum = (collection, fieldName) =>
	collection.reduce((total, {[fieldName]: value}) => total + value, 0);

async function runEslint(project) {
	const eslint = new ESLint({
		cwd: project.location,
		baseConfig: eslintPluginUnicorn.configs.all,
		useEslintrc: false,
		extensions: ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.jsx', '.tsx', '.vue'],
		plugins: {
			unicorn: eslintPluginUnicorn,
		},
		fix: true,
		overrideConfig: {
			parser: '@babel/eslint-parser',
			parserOptions: {
				requireConfigFile: false,
				babelOptions: {
					babelrc: false,
					configFile: false,
					allowReturnOutsideFunction: true,
					parserOpts: {
						plugins: [
							'jsx',
							'exportDefaultFrom',
						],
					},
				},
			},
			ignorePatterns: project.ignore,
			rules: {
				// This rule crashing on replace string inside `jsx` or `Unicode escape sequence`
				'unicorn/string-content': 'off',
			},
			overrides: [
				{
					files: ['*.ts', '*.mts', '*.cts', '*.tsx'],
					parser: '@typescript-eslint/parser',
				},
				{
					files: ['*.vue'],
					parser: 'vue-eslint-parser',
					parserOptions: {
						parser: '@typescript-eslint/parser',
						ecmaFeatures: {
							jsx: true,
						},
					},
				},
			],
		},
	});

	const results = await eslint.lintFiles('.');

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
	`);
}

export default runEslint;
