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

test('array and typed array search indices are numbers independently of their elements', t => {
	for (const type of ['Array<string>', 'ReadonlyArray<boolean>', '[string, boolean]', 'Uint8Array', 'BigInt64Array', 'Array<string> | Uint8Array']) {
		const code = [
			`/** @param {${type}} values */ function run(values, value) {`,
			'check(values.indexOf(value)); check(values.lastIndexOf(value));',
			'check(values.findIndex(() => "yes")); check(values.findLastIndex(() => ({})));',
			'}',
		].join('\n');
		t.assert.deepStrictEqual(getVerdicts(code), [true, true, true, true], type);
	}

	t.assert.deepStrictEqual(getVerdicts('function run(values: readonly string[]) { check(values.findIndex(() => true)); check(values.lastIndexOf("x")); }'), [true, true]);
	t.assert.deepStrictEqual(getVerdicts('check(new BigUint64Array().findLastIndex(() => true)); check(["x"].indexOf("missing"));'), [true, true]);
});

test('numeric search inference requires a definite indexed collection receiver', t => {
	for (const type of ['unknown', '?Array<string>', 'Array<string> | Set<string>', 'ArrayLike<string>', '{indexOf: () => string}']) {
		const code = [
			`/** @param {${type}} values */ function run(values) {`,
			'check(values.indexOf("x")); check(values.lastIndexOf("x"));',
			'check(values.findIndex(() => true)); check(values.findLastIndex(() => true));',
			'}',
		].join('\n');
		t.assert.deepStrictEqual(getVerdicts(code), [false, false, false, false], type);
	}

	t.assert.deepStrictEqual(getVerdicts('/** @param {string} value */ function run(value) { check(value.findIndex(Boolean)); check(value.findLastIndex(Boolean)); }'), [false, false]);
	const code = [
		'/** @param {Array<string>} values */ function run(values) {',
		'check(values?.findIndex(() => true)); check(values.findIndex?.(() => true)); check(values["findIndex"](() => true));',
		'check(values.find(() => true)); check(values.findLast(() => true)); check(values.at(0));',
		'check(values.charCodeAt(0)); check(values.localeCompare("x"));',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [false, false, false, false, false, false, false, false]);
});

test('numeric search inference respects native annotations and unresolved documented receivers', t => {
	t.assert.deepStrictEqual(getVerdicts('/** @param {Array<string>} values */ function run(values: {indexOf(): string}) { check(values.indexOf()); }'), [false]);
	t.assert.deepStrictEqual(getVerdicts('/** @param {{indexOf: () => string}} values */ function run(values: readonly string[]) { check(values.indexOf("x")); }'), [true]);
	t.assert.deepStrictEqual(getVerdicts('/** @type {unknown} */ const values = ["x"]; check(values.indexOf("x"));'), [false]);
	t.assert.deepStrictEqual(getVerdicts('/** @param {Array<string>} [values] */ function run(values) { check(values.indexOf("x")); }'), [false]);
	t.assert.deepStrictEqual(getVerdicts('const first = second; const second = first; check(first.indexOf("x"));'), [false]);
	const code = [
		'/** @param {Array<string>} values */ function run(values) {',
		'check((values as readonly string[]).indexOf("x")); check((values satisfies readonly string[]).findIndex(Boolean));',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [true, true]);
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

test('length properties on documented and native records are not assumed numeric', t => {
	for (const type of ['{length: string}', '{length: boolean}', '{length: bigint}', 'unknown', 'Map<string, number>', '?string', 'Array<string> | {length: string}']) {
		const code = `/** @param {${type}} value */ function run(value) { check(value.length); }`;
		t.assert.deepStrictEqual(getVerdicts(code), [false], type);
	}

	const code = [
		'function native(value: {length: string}) { check(value.length); }',
		'/** @param {Array<string>} value */ function overridden(value: {length: string}) { check(value.length); }',
		'/** @type {unknown} */ const uncertain = []; check(uncertain.length);',
		'/** @param {{length: string}} value */ function array(value: string[]) { check(value.length); }',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [false, false, false, true]);
});

test('length properties on definite string array and typed array receivers remain numeric', t => {
	for (const type of ['string', 'Array<string>', 'ReadonlyArray<number>', '[string, number]', 'Uint8Array', 'BigInt64Array', 'Array<string> | Uint8Array']) {
		const code = `/** @param {${type}} value */ function run(value) { check(value.length); }`;
		t.assert.deepStrictEqual(getVerdicts(code), [true], type);
	}

	const code = [
		'/** @returns {Array<string>} */ function read() { return source; } check(read().length);',
		'const values = new Uint8Array(); const alias = values; check(alias.length);',
		'/** @param {string} [value] */ function optional(value) { check(value.length); check(value?.length); }',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [true, true, false, false]);
});

test('direct numeric object lengths and other length properties remain numeric', t => {
	t.assert.deepStrictEqual(getVerdicts('check({length: 5}.length); check({"length": -0}.length); check({length: -5}.length);'), [true, true, true]);
	t.assert.deepStrictEqual(getVerdicts('check([1, 2].length); check("hello".length); check(unknown.length);'), [true, true, false]);
	t.assert.deepStrictEqual(getVerdicts('check({length: "5", length: 1}.length);'), [true]);
});

test('function literal lengths are numeric while class lengths can be overridden', t => {
	const code = [
		'check(function (value) {}.length);',
		'check((value => value).length);',
		'check(async function () {}.length);',
		'check(function* () {}.length);',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [true, true, true, true]);
	t.assert.deepStrictEqual(getVerdicts('check(class { static length = "5"; }.length); check(class { static get length() { return false; } }.length);'), [false, false]);
});

test('map and set sizes are numeric independently of their entries', t => {
	for (const type of ['Map<string, boolean>', 'ReadonlyMap<string, unknown>', 'Set<bigint>', 'ReadonlySet<string>', 'Map<string, number> | Set<boolean>']) {
		const code = `/** @param {${type}} values */ function run(values) { check(values.size); }`;
		t.assert.deepStrictEqual(getVerdicts(code), [true], type);
	}

	const code = [
		'check(new Map().size); check(new Set().size);',
		'const values = new Set(); const alias = values; check(alias.size);',
		'/** @returns {ReadonlyMap<string, number>} */ function read() { return source; } check(read().size);',
		'function native(values: ReadonlySet<string>) { check(values.size); }',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [true, true, true, true, true]);
});

test('size inference requires a definite map or set receiver', t => {
	for (const type of ['WeakMap<object, number>', 'WeakSet<object>', 'Array<number>', 'string', 'unknown', '{size: string}', '?Set<number>', 'Map<string, number> | {size: string}']) {
		const code = `/** @param {${type}} values */ function run(values) { check(values.size); }`;
		t.assert.deepStrictEqual(getVerdicts(code), [false], type);
	}

	const code = [
		'/** @param {Set<number>} [values] */ function optional(values) { check(values.size); }',
		'/** @param {Set<number>} values */ function access(values) { check(values?.size); check(values["size"]); }',
		'/** @type {unknown} */ const values = new Map(); check(values.size);',
		'/** @param {Map<string, number>} values */ function native(values: {size: string}) { check(values.size); }',
		'/** @param {{size: string}} values */ function overridden(values: Map<string, number>) { check(values.size); }',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [false, false, false, false, false, true]);
});

test('Date timestamp factories return numbers independently of their arguments', t => {
	const code = [
		'check(Date.now()); check(Date.parse(text)); check(Date.UTC(year, month, day));',
		'/** @param {string} value */ function parse(value) { check(Date.parse(value)); }',
		'/** @param {number} year */ function utc(year) { check(Date.UTC(year)); }',
		'check(Date.parse("invalid")); check(Date.UTC());',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [true, true, true, true, true, true, true]);
});

test('Date timestamp inference excludes constructors arbitrary methods and uncertain calls', t => {
	const code = [
		'check(Date()); check(new Date()); check(other.parse(value)); check(Date.other(value));',
		'check(Date?.parse(value)); check(Date.parse?.(value)); check(Date["parse"](value));',
		'/** @param {{parse: () => string}} value */ function run(value) { check(value.parse()); }',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [false, false, false, false, false, false, false, false]);
});

for (const method of [
	'getDate',
	'getDay',
	'getFullYear',
	'getHours',
	'getMilliseconds',
	'getMinutes',
	'getMonth',
	'getSeconds',
	'getTime',
	'getTimezoneOffset',
	'getUTCDate',
	'getUTCDay',
	'getUTCFullYear',
	'getUTCHours',
	'getUTCMilliseconds',
	'getUTCMinutes',
	'getUTCMonth',
	'getUTCSeconds',
	'valueOf',
]) {
	test(`Date ${method} results are numbers for documented and native receivers`, t => {
		t.assert.deepStrictEqual(getVerdicts(`/** @param {Date} value */ function run(value) { check(value.${method}()); }`), [true]);
		t.assert.deepStrictEqual(getVerdicts(`function run(value: Date) { check(value.${method}()); }`), [true]);
		const validDate = new Date(0);
		const invalidDate = new Date(NaN);
		t.assert.strictEqual(typeof validDate[method](), 'number');
		t.assert.strictEqual(Number.isNaN(invalidDate[method]()), true);
	});
}

test('Date numeric getters retain documented factories aliases and native precedence', t => {
	const code = [
		'/** @returns {Date} */ function read() { return source; } check(read().getTime());',
		'/** @param {Date} value */ function alias(value) { const date = value; check(date.valueOf()); }',
		'check(new Date(0).getUTCFullYear());',
		'/** @param {Date} value */ function native(value: {getTime(): string}) { check(value.getTime()); }',
		'/** @param {{getTime: () => string}} value */ function overridden(value: Date) { check(value.getTime()); }',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [true, true, true, false, true]);
});

test('Date numeric getters require definite receivers and direct calls', t => {
	for (const type of ['unknown', '?Date', 'Date | {getTime: () => string}', '{getTime: () => string}', 'number']) {
		t.assert.deepStrictEqual(getVerdicts(`/** @param {${type}} value */ function run(value) { check(value.getTime()); }`), [false], type);
	}

	const code = [
		'/** @param {Date} [value] */ function optional(value) { check(value.getTime()); }',
		'/** @param {Date} value */ function run(value) {',
		'check(value?.getTime()); check(value.getTime?.()); check(value["getTime"]());',
		'check(value.toJSON()); check(value.toISOString()); check(value.setTime(0)); check(value.getYear());',
		'}',
		'/** @type {unknown} */ const date = new Date(); check(date.getTime());',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [false, false, false, false, false, false, false, false, false]);
});

test('Math f16round returns numbers for unknown and documented arguments', t => {
	const code = [
		'check(Math.f16round(value)); check(Math.f16round());',
		'/** @param {unknown} value */ function run(value) { check(Math.f16round(value)); }',
		'/** @param {number} value */ function numeric(value) { check(Math.f16round(value)); }',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [true, true, true, true]);
});

test('Math f16round inference retains direct static call boundaries', t => {
	const code = [
		'check(Math.f16round?.(value)); check(Math?.f16round(value)); check(Math["f16round"](value));',
		'check(other.f16round(value)); check(Math.other(value)); check(new Math.f16round(value));',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [false, false, false, false, false, false]);
});
