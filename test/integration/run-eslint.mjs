import {ESLint} from 'eslint';
import {codeFrameColumns} from '@babel/code-frame';
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
				},
			],
		},
	});

	const result = await eslint.lintFiles('.');

	const errors = result
		.filter(file => file.fatalErrorCount > 0)
		.flatMap(
			file => file.messages
				.filter(message => message.fatal)
				.map(message => new UnicornEslintFatalError(message, file)),
		);

	if (errors.length === 0) {
		return;
	}

	throw new UnicornIntegrationTestError(project, errors);
}

export default runEslint;
