import test from 'node:test';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {needsSemicolon} from '../../rules/utils/index.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

/*
Check whether replacing the `marker` identifier in `code` with `replacement` needs a semicolon before it.
*/
const getResult = (code, replacement, languageOptions = {}) => {
	let result;
	const messages = linter.verify(code, {
		languageOptions,
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'Identifier[name="marker"]'(node) {
								result = needsSemicolon(context.sourceCode.getTokenBefore(node), context, replacement);
							},
						}),
					},
				},
			},
		},
		rules: {'test/inspect': 'error'},
	});
	if (messages.length > 0) {
		throw new Error(messages.map(message => message.message).join('\n'));
	}

	return result;
};

const typescriptLanguageOptions = {
	parser: parsers.typescript.implementation,
	parserOptions: parsers.typescript.mergeParserOptions(),
};

test('a statement that ends with a string token needs a semicolon', t => {
	t.assert.strictEqual(getResult('import foo from \'foo\'\nmarker', '[bar]'), true);
	t.assert.strictEqual(getResult('import foo from \'foo\';\nmarker', '[bar]'), false);
});

test('a class field ending with an object, non-null assertion, or instantiation expression needs a semicolon', t => {
	t.assert.strictEqual(getResult(outdent`
		class Foo {
			bar = {}
			marker = 1
		}
	`, '[baz]'), true);

	for (const code of [
		outdent`
			class Foo {
				bar = baz!
				marker = 1
			}
		`,
		outdent`
			class Foo {
				bar = baz<string>
				marker = 1
			}
		`,
	]) {
		t.assert.strictEqual(getResult(code, '[qux]', typescriptLanguageOptions), true);
	}
});
