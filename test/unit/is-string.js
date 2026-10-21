import test from 'node:test';
import {Linter} from 'eslint';
import isString, {isKnownNonString} from '../../rules/utils/is-string.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

const getResults = (code, inspect = isString) => {
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
								results.push(inspect(node.arguments[0], context));
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

test('uses JSDoc string annotations without type information', t => {
	for (const type of ['string', 'String', '\'ready\'', 'string | \'ready\'']) {
		const code = `/** @param {${type}} value */ function run(value) { inspect(value); }`;
		t.assert.deepStrictEqual(getResults(code), [true], code);
	}

	t.assert.deepStrictEqual(getResults('/** @returns {string} */ function create() { return source; } inspect(create());'), [true]);
	t.assert.deepStrictEqual(getResults('/** @param {number} value */ function run(value) { inspect(value); }', isKnownNonString), [true]);
	t.assert.deepStrictEqual(getResults('/** @type {unknown} */ const value = "ready"; inspect(value);'), [false]);
	t.assert.deepStrictEqual(getResults('/** @type {number} */ const value = "ready"; inspect(value);'), [false]);
	for (const type of ['?string', 'string | undefined', 'string[]', 'Array<string>', '() => string', 'Unresolved']) {
		const code = `/** @param {${type}} value */ function run(value) { inspect(value); }`;
		t.assert.deepStrictEqual(getResults(code), [false], code);
	}
});

for (const method of [
	'charAt',
	'concat',
	'normalize',
	'padEnd',
	'padStart',
	'repeat',
	'slice',
	'substring',
	'toLocaleLowerCase',
	'toLocaleUpperCase',
	'toLowerCase',
	'toUpperCase',
	'toWellFormed',
	'trim',
	'trimEnd',
	'trimStart',
]) {
	test(`recognizes ${method} results on documented and native string receivers`, t => {
		const documented = `/** @param {string} text */ function run(text) { inspect(text.${method}()); }`;
		const native = `function run(text: string) { inspect(text.${method}()); }`;
		t.assert.deepStrictEqual(getResults(documented), [true]);
		t.assert.deepStrictEqual(getResults(native), [true]);
	});
}

test('string method chains retain callback results and constant aliases', t => {
	const code = [
		'/** @returns {string} */ function read() { return source; }',
		'const alias = read().trim(); inspect(alias.toLowerCase());',
		'/** @param {() => string} read */ function run(read) { inspect(read().slice(1).trimEnd()); }',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [true, true]);
});

test('well-formed string conversion retains uncertain receiver and optional-call boundaries', t => {
	const code = [
		'/** @param {?string} text */ function nullable(text) { inspect(text.toWellFormed()); }',
		'/** @param {unknown} text */ function unknown(text) { inspect(text.toWellFormed()); }',
		'/** @param {string} text */ function optional(text) { inspect(text?.toWellFormed()); inspect(text.toWellFormed?.()); inspect(text["toWellFormed"]()); }',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, false, false, false, false]);
});

test('string method results preserve uncertain and non-string receiver boundaries', t => {
	for (const type of ['?string', 'string | undefined', 'string | number', 'unknown', 'Array<string>', '{trim(): string}']) {
		const code = `/** @param {${type}} text */ function run(text) { inspect(text.trim()); }`;
		t.assert.deepStrictEqual(getResults(code), [false], type);
	}
});

test('optional calls and unrelated or computed string methods remain uncertain', t => {
	const code = [
		'/** @param {string} text */ function run(text) {',
		' inspect(text?.trim()); inspect(text.trim?.()); inspect(text["trim"]());',
		' inspect(text.at(0)); inspect(text.split("")); inspect(text.unknown());',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, false, false, false, false, false]);
});

test('delegating replacement methods do not promise string results', t => {
	const code = [
		'const pattern = {[Symbol.replace]() { return 123; }};',
		'/** @param {string} text */ function run(text) {',
		' inspect(text.replace(pattern, "")); inspect(text.replaceAll(pattern, ""));',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, false]);
});

test('native receiver annotations remain authoritative in string method chains', t => {
	const code = [
		'/** @param {string} text */ function run(text: number) { inspect(text.trim()); }',
		'/** @param {number} text */ function other(text: string) { inspect(text.trim()); }',
		'function boxed(text: String) { inspect(text.trim()); }',
		'/** @param {string} text */ function asserted(text) { inspect((text as number).trim()); }',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, true, false, false]);
});

test('string method chains preserve explicit annotation trust and reject reassigned inferred receivers', t => {
	const code = [
		'/** @type {string} */ let documented = source; documented = other; inspect(documented.trim());',
		'let inferred = "text"; inferred = other; inspect(inferred.trim());',
		'/** @type {unknown} */ const uncertain = "text"; inspect(uncertain.trim());',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [true, false, false]);
});

test('string method inference terminates on cyclic receiver aliases', t => {
	t.assert.deepStrictEqual(getResults('const text = text.trim(); inspect(text);'), [false]);
	t.assert.deepStrictEqual(getResults('const first = second.trim(); const second = first.toUpperCase(); inspect(first); inspect(second);'), [false, false]);
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

test('known non-string checks distinguish annotations from cyclic concatenations', t => {
	t.assert.deepStrictEqual(getResults('function foo(text: string, number: number) { inspect(text); inspect(number); }', isKnownNonString), [false, true]);
	t.assert.deepStrictEqual(getResults('const text = text + ""; inspect(text);', isKnownNonString), [false]);
	t.assert.deepStrictEqual(getResults('const first = second + first; const second = first; inspect(first); inspect(second);', isKnownNonString), [false, false]);
});
