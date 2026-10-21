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

test('uses JSDoc numeric annotations without promoting optional or unknown types', t => {
	for (const type of ['number', 'Number', '5', 'number | 5']) {
		t.assert.deepStrictEqual(getVerdicts(`/** @param {${type}} value */ function run(value) { check(value); }`), [true], type);
	}

	t.assert.deepStrictEqual(getVerdicts('/** @type {unknown} */ const value = 1; check(value);'), [false]);
	t.assert.deepStrictEqual(getVerdicts('/** @param {number} [value] */ function run(value) { check(value); }'), [false]);
	t.assert.deepStrictEqual(getVerdicts('/** @param {?number} value */ function run(value) { check(value); }'), [false]);
});

test('update expressions', t => {
	t.assert.deepStrictEqual(getVerdicts('function f(foo: number) { check(foo++); }'), [true]);
	t.assert.deepStrictEqual(getVerdicts('check(foo++);'), [false]);
});

test('codePointAt can return undefined for empty strings or out-of-bounds indices', t => {
	t.assert.deepStrictEqual(getVerdicts('check("".codePointAt(0)); check("a".codePointAt(-1)); check("a".codePointAt(1));'), [false, false, false]);
	t.assert.deepStrictEqual(getVerdicts('check("a".codePointAt(0)); check("🦄".codePointAt(0)); check("a".codePointAt());'), [false, false, false]);
	t.assert.deepStrictEqual(getVerdicts('function f(value: string, index: number) { check(value.codePointAt(index)); check(value!.codePointAt(index)); }'), [false, false]);
});

test('charCodeAt and explicit codePointAt coercions are numeric', t => {
	t.assert.deepStrictEqual(getVerdicts('check("".charCodeAt(0)); check("a".charCodeAt(0)); check("a".charCodeAt(-1));'), [true, true, true]);
	t.assert.deepStrictEqual(getVerdicts('check(Number("".codePointAt(0))); check(+"".codePointAt(0)); check("".codePointAt(0) - 0);'), [true, true, true]);
});

test('string search hooks can return nonnumeric values', t => {
	const pattern = {
		[Symbol.search]: () => 'not a number',
	};
	t.assert.strictEqual('text'.search(pattern), 'not a number');
	const code = [
		'const pattern = {[Symbol.search]() { return "not a number"; }};',
		'/** @param {string} text */ function run(text) {',
		' check(text.search(pattern)); check(text.trim().search(pattern));',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [false, false]);
});

test('unknown search patterns do not borrow the numeric result of other string methods', t => {
	const code = [
		'/** @param {string} text */ function run(text, pattern) {',
		' check(text.search(pattern)); check(text.indexOf(pattern)); check(text.charCodeAt(0));',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [false, true, true]);
});

test('optional numeric annotations do not guarantee a number', t => {
	t.assert.deepStrictEqual(getVerdicts('function f(input?: number) { check(input); check(input!); check((true, input)); }'), [false, false, false]);
	t.assert.deepStrictEqual(getVerdicts('function f(input?: 5) { check(input); }'), [false]);
	t.assert.deepStrictEqual(getVerdicts('class Value { constructor(public input?: number) { check(input); } }'), [false]);
});

test('optional annotation controls retain definite numeric bindings and expressions', t => {
	t.assert.deepStrictEqual(getVerdicts('function f(input: number) { check(input); } function g(input: 5) { check(input); }'), [true, true]);
	t.assert.deepStrictEqual(getVerdicts('function f(input: number = 3) { check(input); } const value: number = 5; check(value);'), [true, true]);
	t.assert.deepStrictEqual(getVerdicts('function f(input?: number) { check(+input); check(input - 0); }'), [true, true]);
});

test('known object lengths are left to static evaluation', t => {
	t.assert.deepStrictEqual(getVerdicts('check({length: "5"}.length); check({"length": false}.length); check({length: 5n}.length);'), [false, false, false]);
	t.assert.deepStrictEqual(getVerdicts('check({}.length); check({foo: 1}.length); check({length: value}.length);'), [false, false, false]);
	t.assert.deepStrictEqual(getVerdicts('const object = {"length": "5"}; check(object.length); const empty = {}; check(empty.length);'), [false, false]);
	t.assert.deepStrictEqual(getVerdicts('check(({length: "5"} as const).length); const object = {length: "5"} as const; check(object!.length);'), [false, false]);
	t.assert.deepStrictEqual(getVerdicts('const object = {length: 5}; check(object.length); object.length = "5"; check(object.length);'), [false, false]);
	t.assert.deepStrictEqual(getVerdicts('check({length: 1, length: "5"}.length); check({length: 1, ...other}.length);'), [false, false]);
});

test('direct numeric object lengths and other length properties remain numeric', t => {
	t.assert.deepStrictEqual(getVerdicts('check({length: 5}.length); check({"length": -0}.length); check({length: -5}.length);'), [true, true, true]);
	t.assert.deepStrictEqual(getVerdicts('check([1, 2].length); check("hello".length); check(unknown.length);'), [true, true, true]);
	t.assert.deepStrictEqual(getVerdicts('check({length: "5", length: 1}.length);'), [true]);
});
