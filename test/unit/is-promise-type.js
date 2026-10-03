import test from 'node:test';
import {Linter} from 'eslint';
import {isPromiseType} from '../../rules/utils/index.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

const linter = new Linter();

const getResult = code => {
	const results = [];
	const messages = linter.verify(code, {
		files: ['**/*.ts'],
		languageOptions: {
			parser: typescriptEslintParser,
			parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
		},
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'Identifier[name="marker"]'(node) {
								const {parserServices} = context.sourceCode;
								results.push(isPromiseType(parserServices.getTypeAtLocation(node), parserServices.program.getTypeChecker()));
							},
						}),
					},
				},
			},
		},
		rules: {'test/inspect': 'error'},
	}, 'file.ts');
	if (messages.length > 0) {
		throw new Error(messages.map(message => message.message).join('\n'));
	}

	return results;
};

test('checks every member of a union type', t => {
	for (const [type, expected] of [
		['Promise<string> | Promise<number>', true],
		['Promise<string> | undefined', true],
		['string | number', false],
		['Promise<string> | number', undefined],
	]) {
		t.assert.deepStrictEqual(getResult(`declare const marker: ${type};`), [expected], type);
	}
});
