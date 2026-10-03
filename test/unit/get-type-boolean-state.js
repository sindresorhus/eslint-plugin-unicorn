import test from 'node:test';
import {Linter} from 'eslint';
import {getTypeBooleanState} from '../../rules/utils/get-type-boolean-state.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

const linter = new Linter();

/*
Return the boolean state of the type of the first argument of each `check()` call in `code`.
*/
const getStates = code => {
	const states = [];

	const messages = linter.verify(code, {
		files: ['**'],
		languageOptions: {
			parser: typescriptEslintParser,
			parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							'CallExpression[callee.name="check"]'(node) {
								const {parserServices} = context.sourceCode;
								states.push(getTypeBooleanState(parserServices.getTypeAtLocation(node.arguments[0]), parserServices.program.getTypeChecker()));
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	}, {filename: 'file.ts'});

	const fatalMessage = messages.find(message => message.fatal);
	if (fatalMessage) {
		throw new Error(fatalMessage.message);
	}

	return states;
};

test('a recursive type is unknown', t => {
	t.assert.deepStrictEqual(getStates('type Recursive = boolean | (() => Recursive); declare const value: Recursive; check(value);'), ['unknown']);
});
