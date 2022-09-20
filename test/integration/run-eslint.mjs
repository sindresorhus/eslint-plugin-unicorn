import {ESLint} from 'eslint';
import {codeFrameColumns} from '@babel/code-frame';
import Piscina from 'piscina';
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

const piscina = new Piscina({
  filename: new URL('./worker.mjs', import.meta.url).href
});
async function runEslint(project) {
	const result = await piscina.run(project);

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
