import test from 'node:test';
import {Linter} from 'eslint';
import isBigInt from '../../rules/utils/is-bigint.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

/*
Return whether the first argument of each `check()` call in `code` is a bigint.
*/
const getVerdicts = (code, {typeAware = false} = {}) => {
	const verdicts = [];

	const messages = linter.verify(code, {
		files: ['**'],
		languageOptions: {
			parser: typeAware ? typescriptEslintParser : parsers.typescript.implementation,
			parserOptions: typeAware
				? {projectService: {allowDefaultProject: ['*.ts']}}
				: parsers.typescript.mergeParserOptions(),
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							'CallExpression[callee.name="check"]'(node) {
								verdicts.push(isBigInt(node.arguments[0], context));
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

test('`satisfies` with a bigint type', t => {
	t.assert.deepStrictEqual(getVerdicts('check(foo satisfies bigint);'), [true]);
	t.assert.deepStrictEqual(getVerdicts('check(foo satisfies 1n);'), [true]);
	t.assert.deepStrictEqual(getVerdicts('check(foo satisfies 1);'), [false]);
});

test('a bigint literal type annotation', t => {
	t.assert.deepStrictEqual(getVerdicts('declare const foo: 1n; check(foo);'), [true]);
	t.assert.deepStrictEqual(getVerdicts('declare const foo: 1; check(foo);'), [false]);
});

test('uses JSDoc bigint annotations and preserves unknown types', t => {
	for (const type of ['bigint', '1n', 'bigint | 1n']) {
		t.assert.deepStrictEqual(getVerdicts(`/** @param {${type}} value */ function run(value) { check(value); }`), [true], type);
	}

	t.assert.deepStrictEqual(getVerdicts('/** @returns {bigint} */ function create() { return source; } check(create());'), [true]);
	t.assert.deepStrictEqual(getVerdicts('/** @type {unknown} */ const value = 1n; check(value);'), [false]);
	t.assert.deepStrictEqual(getVerdicts('/** @param {bigint} [value] */ function run(value) { check(value); }'), [false]);
});

test('a bigint literal type from type information', t => {
	t.assert.deepStrictEqual(getVerdicts('declare const object: {a: 1n; b: bigint; c: 1}; check(object.a); check(object.b); check(object.c);', {typeAware: true}), [true, true, false]);
});
