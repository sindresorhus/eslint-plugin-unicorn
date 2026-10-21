import {stripTypeScriptTypes} from 'node:module';
import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

const linter = new Linter();

test({
	valid: [
		'/** @type {() => boolean} */ let read; read = () => "changed"; Boolean(read());',
		'/** @type {unknown} */ const flag = true; Number(flag ? 1 : "text");',
		'/** @type {(() => boolean) & (() => string)} */ const read = () => "yes"; Boolean(read());',
		{
			code: '/** @returns {string} */ let read: () => unknown = (): string => source; String(read());',
			languageOptions: {parser: parsers.typescript},
		},
		'/** @param {() => boolean} read */ function run(read) { read = () => 0; Boolean(read()); }',
		'/** @returns {?string} */ function text() { return source; } Boolean(text().includes("x"));',
	],
	invalid: [{
		code: '/** @param {string} text */ function run(text) { return String(text || ""); }',
		output: '/** @param {string} text */ function run(text) { return (text || ""); }',
		errors: [{messageId: 'no-useless-coercion'}],
	}, {
		code: '/** @type {unknown} */ const flag = true; Number(flag ? 1 : 2);',
		output: '/** @type {unknown} */ const flag = true; (flag ? 1 : 2);',
		errors: [{messageId: 'no-useless-coercion'}],
	}, {
		code: '/** @returns {string} */ function text() { return source; } Boolean(text().includes("x"));',
		output: '/** @returns {string} */ function text() { return source; } text().includes("x");',
		errors: [{messageId: 'no-useless-coercion'}],
	}],
});

test({
	valid: [
		'/** @type {"left\n * right"} */ let text; String(text);',
		'/** @returns {"left\r\n * right"} */ function text() { return source; } String(text());',
	],
	invalid: [{
		code: '/** @type {\n * "left"\n * | "right"\n * } */ let text; String(text);',
		output: '/** @type {\n * "left"\n * | "right"\n * } */ let text; text;',
		errors: [{messageId: 'no-useless-coercion'}],
	}],
});

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			'/** @param {Date} value */ function run(value) { return String(value.toJSON()); }',
			'/** @param {Date} value */ function run(value) { return String(value?.toISOString()); }',
			'/** @param {?Date} value */ function run(value) { return String(value.toISOString()); }',
			'/** @param {{toISOString: () => number}} value */ function run(value) { return String(value.toISOString()); }',
			'/** @param {{size: string}} value */ function run(value) { return Number(value.size); }',
			'/** @param {?Set<number>} value */ function run(value) { return Number(value?.size); }',
			'/** @param {{length: string}} value */ function run(value) { return Number(value.length); }',
			'/** @param {{length: bigint}} value */ function run(value) { return +value.length; }',
			'/** @param {unknown} value */ function run(value) { return Number(value.length); }',
			'/** @returns {number | undefined} */ function count() { return source; } Number(count());',
			'/** @returns {number} */ async function count() { return source; } Number(count());',
			'/** @returns {number} */ function* count() { yield source; } +count();',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [
			...['toISOString', 'toUTCString', 'toDateString', 'toTimeString', 'toLocaleDateString', 'toLocaleTimeString', 'toString', 'toLocaleString'].map(method => ({
				filename: 'file.ts',
				code: `/** @param {Date} value */ function run(value) { return String(value.${method}()); }`,
				output: `/** @param {Date} value */ function run(value) { return value.${method}(); }`,
				errors: [{messageId: 'no-useless-coercion'}],
			})),
			...['Map<string, boolean>', 'ReadonlySet<bigint>'].map(type => ({
				filename: 'file.ts',
				code: `/** @param {${type}} values */ function run(values) { return Number(values.size); }`,
				output: `/** @param {${type}} values */ function run(values) { return values.size; }`,
				errors: [{messageId: 'no-useless-coercion'}],
			})),
			{
				filename: 'file.ts',
				code: '/** @returns {number} */ function count() { return source; } Number(count());',
				output: '/** @returns {number} */ function count() { return source; } count();',
				errors: [{messageId: 'no-useless-coercion'}],
			},
			{
				filename: 'file.ts',
				code: '/** @return {Number} */ const count = () => source; +count();',
				output: '/** @return {Number} */ const count = () => source; count();',
				errors: [{messageId: 'no-useless-coercion'}],
			},
		],
	});
}

test({
	valid: ['Number(class {}.length);', 'Number(class { static length = "5"; }.length);'],
	invalid: [
		...[
			['Number(function () {}.length);', '(function () {}.length);'],
			['Number(async function () {}.length);', '(async function () {}.length);'],
			['use()\nNumber(function () {}.length);', 'use()\n;(function () {}.length);'],
		].map(([code, output]) => ({code, output, errors: 1})),
	],
});

nodeTest('nonnumeric object lengths still require numeric coercion', t => {
	const code = 'Number({length: "5"}.length);';
	const {output, fixed, messages} = linter.verifyAndFix(code, {
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	});
	t.assert.strictEqual(runInNewContext(code), 5);
	t.assert.strictEqual(runInNewContext(output), 5);
	t.assert.strictEqual(fixed, false);
	t.assert.deepStrictEqual(messages, []);
});

nodeTest('documented string lengths retain coercion and numeric results', t => {
	for (const expression of ['Number(value.length)', '+value.length', 'Number(~value.length)']) {
		const code = `/** @param {{length: string}} value */ function run(value) { return ${expression}; } const result = run({length: "5"}); JSON.stringify([typeof result, result]);`;
		const {output, fixed, messages} = linter.verifyAndFix(code, {
			plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
			rules: {'unicorn/no-useless-coercion': 'error'},
		});
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(output), JSON.stringify(['number', expression.includes('~') ? -6 : 5]));
	}
});

nodeTest('optional numeric parameters still require numeric coercion', t => {
	const code = 'function value(input?: number) { return Number(input); } Number.isNaN(value());';
	const {output, fixed, messages} = linter.verifyAndFix(code, {
		languageOptions: {parser: typescriptEslintParser},
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	});
	t.assert.strictEqual(runInNewContext(stripTypeScriptTypes(code)), true);
	t.assert.strictEqual(runInNewContext(stripTypeScriptTypes(output)), true);
	t.assert.strictEqual(fixed, false);
	t.assert.deepStrictEqual(messages, []);
});

nodeTest('an absent code point still requires numeric coercion', t => {
	const code = 'Number.isNaN(Number("".codePointAt(0)));';
	const {output, fixed, messages} = linter.verifyAndFix(code, {
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	});
	t.assert.strictEqual(runInNewContext(code), true);
	t.assert.strictEqual(runInNewContext(output), true);
	t.assert.strictEqual(fixed, false);
	t.assert.deepStrictEqual(messages, []);
});

test({
	valid: [
		'Number("".codePointAt(0));',
		'+"a".codePointAt(1);',
		...[
			'function getValue(value: string, index: number) { return Number(value.codePointAt(index)); }',
			'Number((value as string).codePointAt(index));',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	],
	invalid: [],
});

nodeTest('deleting a coerced value preserves the property and delete result', t => {
	const linter = new Linter();
	const config = {
		languageOptions: {parser: typescriptEslintParser},
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	};

	for (const [value, expression] of [
		['1', 'Number(object.value as number)'],
		['1', '+(object.value as number)'],
		['true', 'Boolean(object.value as boolean)'],
		['"x"', 'String(object.value as string)'],
		['1n', 'BigInt(object.value as bigint)'],
		['"x"', '(object.value as string) + ""'],
		['"x"', '"" + (object.value as string)'],
		['"x"', '(object.value as string).toString()'],
	]) {
		const code = `"use strict"; const object = {value: ${value}}; const result = delete (${expression}); JSON.stringify({result, exists: Object.hasOwn(object, "value")});`;
		const {fixed, output, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, false, code);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].fix, undefined);
		const result = runInNewContext(stripTypeScriptTypes(output));
		t.assert.deepStrictEqual(JSON.parse(result), {result: true, exists: true});
	}

	const code = '"use strict"; const result = delete Number(Math.PI); result;';
	const {output, fixed, messages} = linter.verifyAndFix(code, config);
	t.assert.strictEqual(fixed, false);
	t.assert.strictEqual(messages[0].fix, undefined);
	t.assert.strictEqual(runInNewContext(output), true);
	// Exposing the non-configurable reference would throw instead of returning true.
	t.assert.throws(() => runInNewContext('"use strict"; delete Math.PI;'), {name: 'TypeError'});
});

test({
	valid: [],
	invalid: [
		{code: 'const object = [1]; delete Number(object.length);', errors: [{messageId: 'no-useless-coercion'}]},
		{code: 'const object = [1]; delete +object.length;', errors: [{messageId: 'no-useless-coercion'}]},
		{code: 'delete Number(Math.PI);', errors: [{messageId: 'no-useless-coercion'}]},
		...[
			'const object = [1]; delete (Number(object.length) as number);',
			'const object = [1]; delete Number(object.length)!;',
			'const object = [1]; delete (Number(object.length) satisfies number);',
			'const object = [1]; delete (<number>Number(object.length));',
			'const object = [1]; delete Number(object.length satisfies number);',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}, errors: [{messageId: 'no-useless-coercion'}]})),
	],
});

test.typescript({
	valid: [
		'declare const isJson: (value: unknown) => value is string; export const isValidJson = (value: unknown) => Boolean(isJson(value));',
		'declare function isJson(value: unknown): value is string; function isValidJson(value: unknown) { return Boolean(isJson(value)); }',
		'declare function isJson(value: unknown): value is string; const isValidJson = function (value: unknown) { return Boolean(isJson(value)); };',
		'declare function isJson(value: unknown): value is string; const isValidJson = (value: unknown) => { const result = Boolean(isJson(value)); return result; };',
		'const isString = (value: unknown) => Boolean(typeof value === "string");',
		'const isArray = (value: unknown) => Boolean(Array.isArray(value));',
		'const object = {isArray(value: unknown) { return Boolean(Array.isArray(value)); }};',
		'class Validator { isArray(value: unknown) { return Boolean(Array.isArray(value)); } }',
		'function outer(): unknown { return (value: unknown) => Boolean(Array.isArray(value)); }',
		// Conservatively preserve all boolean coercions in functions without return annotations.
		'const getFlag = () => Boolean(true);',
	],
	invalid: [
		[
			'declare function isJson(value: unknown): value is string; const isValidJson = (value: unknown): boolean => Boolean(isJson(value));',
			'declare function isJson(value: unknown): value is string; const isValidJson = (value: unknown): boolean => isJson(value);',
		],
		[
			'function isString(value: unknown): boolean { return Boolean(typeof value === "string"); }',
			'function isString(value: unknown): boolean { return (typeof value === "string"); }',
		],
		[
			'const object = {isArray(value: unknown): boolean { return Boolean(Array.isArray(value)); }};',
			'const object = {isArray(value: unknown): boolean { return Array.isArray(value); }};',
		],
		[
			'class Validator { isArray(value: unknown): boolean { return Boolean(Array.isArray(value)); } }',
			'class Validator { isArray(value: unknown): boolean { return Array.isArray(value); } }',
		],
		[
			'function outer() { return (value: unknown): boolean => Boolean(Array.isArray(value)); }',
			'function outer() { return (value: unknown): boolean => Array.isArray(value); }',
		],
		[
			'declare function isJson(value: unknown): value is string; declare const value: unknown; Boolean(isJson(value));',
			'declare function isJson(value: unknown): value is string; declare const value: unknown; isJson(value);',
		],
		[
			'const stringify = (value: string) => String(value);',
			'const stringify = (value: string) => value;',
		],
	].map(([code, output]) => ({code, output, errors: [{messageId: 'no-useless-coercion'}]})),
});

test({
	valid: [
		{code: 'function getFlag() { return Boolean(true); }', filename: 'file.ts'},
	],
	invalid: [
		{
			code: 'const isArray = value => Boolean(Array.isArray(value));',
			output: 'const isArray = value => Array.isArray(value);',
			errors: [{messageId: 'no-useless-coercion'}],
		},
	],
});

test({
	testerOptions: {
		languageOptions: {
			parser: typescriptEslintParser,
			parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
		},
	},
	valid: [
		'declare const isJson: (value: unknown) => value is string; export const isValidJson = (value: unknown) => Boolean(isJson(value));',
		'declare const validator: {isJson(value: unknown): value is string}; const isValidJson = (value: unknown) => Boolean(validator.isJson(value));',
	].map(code => ({code, filename: 'file.ts'})),
	invalid: [
		[
			'declare const validator: {isJson(value: unknown): value is string}; const isValidJson = (value: unknown): boolean => Boolean(validator.isJson(value));',
			'declare const validator: {isJson(value: unknown): value is string}; const isValidJson = (value: unknown): boolean => validator.isJson(value);',
		],
		[
			'declare const validator: {isJson(value: unknown): value is string}; declare const value: unknown; Boolean(validator.isJson(value));',
			'declare const validator: {isJson(value: unknown): value is string}; declare const value: unknown; validator.isJson(value);',
		],
	].map(([code, output]) => ({
		code,
		output,
		filename: 'file.ts',
		errors: [{messageId: 'no-useless-coercion'}],
	})),
});

test.snapshot({
	valid: [
		// Genuine conversions (argument type is unknown or different)
		'Boolean(1)',
		'Boolean(x)',
		'Boolean(null)',
		'Boolean(x ? 1 : 0)',
		'String(123)',
		'String(x)',
		'String(null)',
		'String([])',
		'Number("5")',
		'Number(x)',
		'Number(null)',
		'Number(bigintValue)',
		'Number(a - b)',
		'Number(a % b)',
		'const modes = new Set(["foo"]); modes.clear(); Number(modes.size ? value : "value");',
		'const modes = new Set(["foo"]); modes.clear(); +((modes.size && value) || "value");',
		'const modes = new Set(["foo"]); modes.clear(); Boolean(modes.size ? true : value);',
		'const modes = new Set(["foo"]); modes.clear(); String(modes.size ? "x" : value);',
		'const alias = condition; var condition = true; String(alias ? "x" : value);',
		'const modes = new Set(["foo"]); modes.clear(); BigInt(modes.size ? 1n : value);',
		'const object = {value: true}; Object.defineProperty(object, "value", {get() { return false; }}); Boolean(object.value ? true : value);',
		'const object = {value: true}; Object.defineProperty(object, "value", {get() { return false; }}); String(object.value ? "x" : value);',
		'const object = {value: true}; Object.defineProperty(object, "value", {get() { return false; }}); BigInt(object.value ? 1n : value);',
		'Number(x?.length)',
		'Number(x.length)',
		'Number(~x.length)',
		'+x.length',
		'Number(/* keep */ x.length)',
		'Boolean(x ?? y)',
		'Boolean(x || false)',
		'Boolean(a && b)',
		'Boolean(x === y ? a : b)',
		'BigInt(5)',
		'BigInt(x)',
		'BigInt("5")',

		// Method return types are not tracked
		'String(x.repeat(3))',
		'String(x.at(0))',

		// `+` on a bigint throws at runtime, so it is never useless
		{code: 'declare const x: bigint; +x', languageOptions: {parser: parsers.typescript}},

		// Out of scope
		'Object({a: 1})',
		'Symbol(x)',
		'Array(x)',
		'new Boolean(true)',
		'new Number(42)',
		'globalThis.Boolean(true)',

		// Operator idioms we intentionally do not flag
		'~~x', // `~~` truncates, so it is never a no-op
		'~~5',
		'!!x', // Covered by ESLint's `no-extra-boolean-cast`
		'!!true',
		'-5', // Negation is not a coercion

		// Operator idioms on values that are not already the target type
		'x + \'\'',
		'5 + \'\'',
		'\'\' + 5',
		'x.toString()',
		'(5).toString()',
		'+x',
		'+\'5\'',
		'x + \'a\'', // Non-empty string is a real concatenation
		'x.toLocaleString()',
		'x[\'toString\']()',
		'x?.toString()',
		'x.toString(2)',

		// Wrong arity / shape
		'Boolean()',
		'Number()',
		'Number(1, 2)',
		'Number(...x)',
		'Boolean?.(true)',

		// Shadowed globals
		'const Boolean = () => {}; Boolean(true)',
		'function f(String) { return String(\'x\'); }',
		'function f(Number) { return Number(42); }',
		'import {String} from \'x\'; String(\'y\')',
	],
	invalid: [
		// Literals
		'Boolean(true)',
		'Boolean(false)',
		'String(\'hello\')',
		'Number(42)',
		'Number(0)',
		'BigInt(1n)',

		// Double coercion
		'Boolean(Boolean(x))',
		'String(String(x))',
		'Number(Number(x))',
		'Number(parseInt(x, 10))',
		'Number(Number.parseFloat(x))',
		'BigInt(BigInt(x))',

		// Already-typed expressions
		'Boolean(a === b)',
		'Boolean(!x)',
		'Boolean(!!x)',
		'Boolean(a > 0 && b > 0)',
		'Boolean(true || false)',
		'Boolean(x instanceof Foo)',
		'Boolean(x in obj)',
		'Boolean(delete obj.x)',
		'Boolean(a?.b === c)',
		'Number(String(x).length)',
		'Number(Math.PI)',
		'Number(Number.MAX_SAFE_INTEGER)',
		'Number(NaN)',
		'Number(x >>> 0)',
		'Number(~String(x).length)',
		'Number(+x)',
		'Number(x * 2)',
		'Number(x % 2)',
		'Number(x > 0 ? 1 : 2)',
		'String(`${x}`)', // eslint-disable-line no-template-curly-in-string
		'String(a + \'b\')',
		'String(typeof x)',
		'String(x ? \'a\' : \'b\')',
		'BigInt(1n + 2n)',
		'BigInt(2n ** 3n)',
		'BigInt(BigInt.asIntN(64, x))',
		'BigInt(x ? 1n : 2n)',

		// Unary `+` on a value already a number
		'+5',
		'+String(x).length',
		'+Number(x)',
		'+(x * 2)',
		'+ +x', // Nested: the inner `+x` is always a number, so the outer `+` is useless

		// Empty-string concatenation on a value already a string
		'\'a\' + \'\'',
		'\'\' + \'a\'',
		'\'\' + \'\'', // Both operands are empty strings
		'`${x}` + \'\'', // eslint-disable-line no-template-curly-in-string
		'(a + \'b\') + \'\'',
		'String(x) + \'\'',

		// `.toString()` on a value already a string
		'\'a\'.toString()',
		'`${x}`.toString()', // eslint-disable-line no-template-curly-in-string
		'(a + \'b\').toString()',
		'String(x).toString()',

		// Resolved variables
		'const flag = true; Boolean(flag)',
		'const name = \'unicorn\'; String(name)',
		'const text = \'x\'; text + \'\'',
		'const n = 5; +n',

		// Fix: parenthesization
		'String(a + \'b\').length',
		'Number(x * 2).toFixed(2)',
		'Boolean(x ? a > 0 : b < 0)',
		// Unary operator parent forces parentheses around a loosely-bound argument
		'!Boolean(a === b)',
		// Strong-precedence argument needs no parentheses, even in a tight position
		'-Number(String(x).length)',
		// Template literal binds tightly, so no parentheses before a member `.`
		'String(`foo`).length',
		// Decimal integer literal needs parentheses before a member `.`
		'Number(5).toFixed(2)',
		// Argument already parenthesized, do not double-wrap
		'Boolean((a === b))',
		'(Number(String(x).length))',
		// Sequence expression keeps its existing parentheses
		'Number((a, String(b).length))',
		// Object literal needs parentheses, otherwise `{` starts a block at statement position
		'Number({length: 1}.length)',

		// Fix: ASI
		outdent`
			foo
			Number(+bar)
		`,

		// Fix: comment inside (reported, not fixed)
		'Number(/* keep */ String(x).length)',
		'+/* keep */ String(x).length',
		'\'a\' /* keep */ + \'\'',
		'(/* keep */ \'a\').toString()',

		// TypeScript
		{code: 'Boolean(x as boolean)', languageOptions: {parser: parsers.typescript}},
		{code: 'Number(x satisfies number)', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const x: string; String(x!)', languageOptions: {parser: parsers.typescript}},
		{code: 'const f = (x: number) => Number(x)', languageOptions: {parser: parsers.typescript}},
		{code: 'const f = (x: bigint) => BigInt(x)', languageOptions: {parser: parsers.typescript}},
		{code: 'Number(<number>x)', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const x: number; Number(x!)', languageOptions: {parser: parsers.typescript}},
		{code: 'BigInt(x as bigint)', languageOptions: {parser: parsers.typescript}},
		// Cast expressions bind loosely, so they need parentheses in a tight position
		{code: 'String(x as string).length', languageOptions: {parser: parsers.typescript}},
		{code: 'Number(x satisfies number).toFixed(2)', languageOptions: {parser: parsers.typescript}},

		// TypeScript: operator idioms on typed values
		{code: 'declare const x: number; +x', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const x: string; x + \'\'', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const x: string; x.toString()', languageOptions: {parser: parsers.typescript}},

		// Type information: a bigint literal type
		{
			code: 'declare const object: {value: 1n}; BigInt(object.value);',
			filename: 'file.ts',
			languageOptions: {
				parser: typescriptEslintParser,
				parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
			},
		},
	],
});

// A user object can have a `length` that is not a number
test({
	valid: [
		'const object = {length: "5"};\nconst a = Number(object.length);',
		'const object = {length: "abc"};\nconst a = +object.length;',
		'const object = {length: true};\nconst a = +object.length;',
		'Number({foo: 1}.length)',
		'const a = Number(foo.length);',
		'Number({length: "5"}.length)',
		'const object = {length: value}; Number(object.length);',
		'const object = {length: 5};\nconst a = Number(object.length);',
		'Number({length: 1, length: "5"}.length)',
		'+({length: 1, ...other}).length',
		...[
			'Number(({length: "5"} as {length: string}).length);',
			'const object = {"length": "5"} as const; +object!.length;',
			'const object = {length: "5"}; Number((object as {length: string}).length);',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	],
	invalid: [
		{
			code: 'foo\nNumber({length: 1}.length)',
			output: 'foo\n;({length: 1}.length)',
			errors: 1,
		},
		{
			code: 'const size = Number(function () {}.length);',
			output: 'const size = function () {}.length;',
			errors: 1,
		},
		{
			code: 'export default Number(function () {}.length);',
			output: 'export default (function () {}.length);',
			errors: 1,
		},
	],
});

test({
	valid: [],
	invalid: [
		['function get() { return Number({value: 1}.value); }', 'function get() { return {value: 1}.value; }'],
		['const get = () => Number({value: 1}.value);', 'const get = () => ({value: 1}.value);'],
		['const get = () => Number(function () {}.length);', 'const get = () => function () {}.length;'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test({
	valid: [],
	invalid: [{
		code: 'export default Number({value: 1}.value);',
		output: 'export default {value: 1}.value;',
		errors: 1,
	}],
});

for (const languageOptions of [
	{parser: parsers.typescript},
	{
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			['boolean', 'Boolean'],
			['string', 'String'],
			['number', 'Number'],
			['bigint', 'BigInt'],
		].map(([type, constructor]) => ({
			code: `/** @param {${type}} input */ function value(input?): ${type} { return ${constructor}(input); }`,
			filename: 'file.ts',
		})),
		invalid: [{
			filename: 'file.ts',
			code: '/** @param {boolean} input */ function value(input = false): boolean { return Boolean(input); }',
			output: '/** @param {boolean} input */ function value(input = false): boolean { return input; }',
			errors: [{messageId: 'no-useless-coercion'}],
		}],
	});
}

nodeTest('an omitted parameter documented as boolean still needs boolean coercion', t => {
	const code = '/** @param {boolean} input */ function value(input?): boolean { return Boolean(input); } value();';
	const {output, fixed, messages} = linter.verifyAndFix(code, {
		languageOptions: {parser: typescriptEslintParser},
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	});
	t.assert.strictEqual(runInNewContext(stripTypeScriptTypes(code)), false);
	t.assert.strictEqual(runInNewContext(stripTypeScriptTypes(output)), false);
	t.assert.strictEqual(fixed, false);
	t.assert.deepStrictEqual(messages, []);
});

const nullableStringFallbackCases = [
	['/** @param {?string} value */ function run(value) { return String((value + 1) ?? ""); } run(null);', '1'],
	['/** @param {?string} value\n * @param {?string} fallback */ function run(value, fallback) { return String(value ?? fallback); } run(null, null);', 'null'],
	['/** @param {?string} value */ function run(value) { return String(value && "text"); } run(null);', 'null'],
];

nodeTest('nullable fallback coercions preserve the result type at runtime', t => {
	for (const [code, expected] of nullableStringFallbackCases) {
		const {output, fixed, messages} = linter.verifyAndFix(code, {
			plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
			rules: {'unicorn/no-useless-coercion': 'error'},
		});
		t.assert.strictEqual(fixed, false);
		t.assert.strictEqual(output, code);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(output), expected);
	}
});

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			...nullableStringFallbackCases.map(([code]) => code),
			'/** @type {(() => string) | (() => number)} */ let read; String(read());',
			'/** @type {?(() => string)} */ let read; String(read());',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [
			...[
				['(() => string) | (() => "text")', 'String'],
				['(() => number) & {label: string}', 'Number'],
				['(() => bigint) | (() => 1n)', 'BigInt'],
			].map(([type, constructor]) => ({
				filename: 'file.ts',
				code: `/** @type {${type}} */ let read; ${constructor}(read());`,
				output: `/** @type {${type}} */ let read; read();`,
				errors: [{messageId: 'no-useless-coercion'}],
			})),
			{
				filename: 'file.ts',
				code: '/** @type {(() => string[]) | (() => readonly string[])} */ let read; Boolean(read().some(predicate));',
				output: '/** @type {(() => string[]) | (() => readonly string[])} */ let read; read().some(predicate);',
				errors: [{messageId: 'no-useless-coercion'}],
			},
		],
	});
}

test({
	valid: [
		'/** @param {() => boolean} read */ function value(read = async () => true) { return Boolean(read()); }',
		'/** @param {() => string} read */ function value(read = function* () {}) { return String(read()); }',
		{
			code: '/** @param {() => string} read */ function value(read = (): boolean => true) { return String(read()); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '/** @param {() => boolean} read */ function value(read = (): string => "text"): boolean { return Boolean(read()); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [{
		code: '/** @param {() => string} read */ function value(read = () => "text") { return String(read()); }',
		output: '/** @param {() => string} read */ function value(read = () => "text") { return read(); }',
		errors: [{messageId: 'no-useless-coercion'}],
	}],
});

for (const initializer of ['async () => true', 'function* () { return true; }']) {
	nodeTest(`a documented synchronous callback with default ${initializer} still needs coercion`, t => {
		const code = `/** @param {() => boolean} read */ function value(read = ${initializer}) { return Boolean(read()); } value();`;
		const {output, fixed, messages} = linter.verifyAndFix(code, {
			plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
			rules: {'unicorn/no-useless-coercion': 'error'},
		});
		t.assert.strictEqual(runInNewContext(code), true);
		t.assert.strictEqual(runInNewContext(output), true);
		t.assert.strictEqual(fixed, false);
		t.assert.deepStrictEqual(messages, []);
	});
}

const assertedCallbackCoercions = [
	['boolean', 'Boolean', 'string', '"text"', true],
	['string', 'String', 'number', '1', '1'],
	['number', 'Number', 'string', '"1"', 1],
	['bigint', 'BigInt', 'number', '1', 1n],
].map(([type, constructor, native, value, expected]) => ({
	code: `/** @param {() => ${type}} read */ function run(read = (() => ${value}) as (() => ${native})): ${type} { return ${constructor}(read()); } run();`,
	expected,
}));

nodeTest('native assertions on default callbacks preserve scalar coercion results', t => {
	for (const {code, expected} of assertedCallbackCoercions) {
		const {output, fixed, messages} = linter.verifyAndFix(code, {
			languageOptions: {parser: typescriptEslintParser},
			plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
			rules: {'unicorn/no-useless-coercion': 'error'},
		});
		t.assert.strictEqual(runInNewContext(stripTypeScriptTypes(output)), expected, code);
		t.assert.strictEqual(fixed, false, code);
		t.assert.strictEqual(output, code);
		t.assert.deepStrictEqual(messages, []);
	}
});

for (const languageOptions of [
	{parser: parsers.typescript},
	{
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
]) {
	test({
		testerOptions: {languageOptions},
		valid: assertedCallbackCoercions.map(({code}) => ({code, filename: 'file.ts'})),
		invalid: [],
	});
}

const nativeCallbackDefault = '/** @param {() => boolean} read */ function value(read = (): boolean => true): boolean { return Boolean(read()); }';
test({
	valid: [{code: nativeCallbackDefault, languageOptions: {parser: parsers.typescript}}],
	invalid: [{
		code: nativeCallbackDefault,
		filename: 'file.ts',
		languageOptions: {
			parser: typescriptEslintParser,
			parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
		},
		output: nativeCallbackDefault.replace('Boolean(read())', 'read()'),
		errors: [{messageId: 'no-useless-coercion'}],
	}],
});
