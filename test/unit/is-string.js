import test from 'node:test';
import {Linter} from 'eslint';
import isString from '../../rules/utils/is-string.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

const getResults = code => {
	const results = [];
	const messages = linter.verify(code, {
		languageOptions: {
			parser: parsers.typescript.implementation,
			parserOptions: parsers.typescript.mergeParserOptions(),
		},
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'CallExpression[callee.name="inspect"]'(node) {
								results.push(isString(node.arguments[0], context));
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

	return results;
};

test('returns `false` for a missing node', t => {
	t.assert.deepStrictEqual(getResults('inspect();'), [false]);
});

test('uses string type annotations', t => {
	t.assert.deepStrictEqual(getResults('inspect(value satisfies string); inspect(value satisfies \'foo\'); inspect(value satisfies number);'), [true, true, false]);
	t.assert.deepStrictEqual(getResults('function foo(value: string) { inspect(value); }'), [true]);
});

test('terminates when concatenation references its own initializer', t => {
	t.assert.deepStrictEqual(getResults('const text = text + ""; inspect(text);'), [true]);
	t.assert.deepStrictEqual(getResults('const text = text + text; inspect(text);'), [false]);
	t.assert.deepStrictEqual(getResults('const first = second + first; const second = first; inspect(first); inspect(second);'), [false, false]);
	t.assert.deepStrictEqual(getResults('const first = second + ""; const second = first; inspect(first); inspect(second);'), [true, true]);
});

test('recognizes concrete concatenation references independently', t => {
	t.assert.deepStrictEqual(getResults('const text = "foo"; const alias = text; inspect(alias + alias);'), [true]);
	t.assert.deepStrictEqual(getResults('const number = 1; const alias = number; inspect(alias + alias);'), [false]);
});

test('terminates when assignments reference their own initializer', t => {
	t.assert.deepStrictEqual(getResults('const text = (text += ""); inspect(text);'), [true]);
	t.assert.deepStrictEqual(getResults('const text = (text = text + ""); inspect(text);'), [true]);
	t.assert.deepStrictEqual(getResults('const text = (text = text); inspect(text);'), [false]);
	t.assert.deepStrictEqual(getResults('const first = (second += first); const second = first; inspect(first); inspect(second);'), [false, false]);
});
