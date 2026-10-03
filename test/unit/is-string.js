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
