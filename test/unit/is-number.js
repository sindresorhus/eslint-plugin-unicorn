import test from 'node:test';
import {Linter} from 'eslint';
import isNumber from '../../rules/utils/is-number.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

/*
Return whether the first argument of each `check()` call in `code` is a number.
*/
const getVerdicts = code => {
	const verdicts = [];

	const messages = linter.verify(code, {
		files: ['**'],
		languageOptions: {
			parser: parsers.typescript.implementation,
			parserOptions: parsers.typescript.mergeParserOptions(),
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							'CallExpression[callee.name="check"]'(node) {
								verdicts.push(isNumber(node.arguments[0], context));
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

	return verdicts;
};

test('assignment expressions', t => {
	t.assert.deepStrictEqual(getVerdicts('check(foo = 1);'), [true]);
	t.assert.deepStrictEqual(getVerdicts('check(foo -= 1);'), [true]);
	t.assert.deepStrictEqual(getVerdicts('check(foo >>>= bar);'), [true]);
	t.assert.deepStrictEqual(getVerdicts('function f(foo: number) { check(foo += 1); }'), [true]);
	t.assert.deepStrictEqual(getVerdicts('check(foo += 1);'), [false]);
	t.assert.deepStrictEqual(getVerdicts('check(foo = bar);'), [false]);
});

test('update expressions', t => {
	t.assert.deepStrictEqual(getVerdicts('function f(foo: number) { check(foo++); }'), [true]);
	t.assert.deepStrictEqual(getVerdicts('check(foo++);'), [false]);
});
