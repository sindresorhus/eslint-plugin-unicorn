import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {outdent} from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);
const MESSAGE_ID = 'prefer-math-min-max';
const SUGGESTION_ID = 'replace-with-math-min-max';

test({
	valid: [
		'const value = "1"; value > 2 ? 2 : value;',
		'const value = `1`; value > 2 ? 2 : value;',
		'const value = ``; value < 2 ? value : 2;',
		'const value = `\\u0031`; value > 2 ? value : 2;',
		'function foo(value = "1") { return value > 2 ? 2 : value; }',
		'function foo(value = `1`) { return value > 2 ? 2 : value; }',
		'function foo(value = ``) { return value < 2 ? value : 2; }',
	],
	invalid: [],
});

test({
	valid: [],
	invalid: [
		...[
			['(/* keep */ height) > 50 ? 50 : height;', 'Math.min((/* keep */ height), 50);', 'min'],
			['height < (50 /* keep */) ? 50 : height;', 'Math.max(height, (50 /* keep */));', 'max'],
		].map(([code, output, method]) => ({code, errors: [{messageId: MESSAGE_ID, suggestions: [{messageId: SUGGESTION_ID, data: {method}, output}]}]})),
	],
});

test({
	valid: [
		'const value = 1n; (/* keep */ value) > 0 ? value : 0;',
	],
	invalid: [
		...[
			['((height /* keep */)) >= 50 ? 50 : height;', 'Math.min(((height /* keep */)), 50);', 'min'],
			['(/* left */ height) > (50 /* right */) ? height : 50;', 'Math.max((/* left */ height), (50 /* right */));', 'max'],
			['height < (50 // keep\r\n) ? height : 50;', 'Math.min(height, (50 // keep\r\n));', 'min'],
			['(/* keep */ first, height) < 50 ? 50 : (first, height);', 'Math.max((/* keep */ first, height), 50);', 'max'],
		].map(([code, output, method]) => ({code, errors: [{messageId: MESSAGE_ID, suggestions: [{messageId: SUGGESTION_ID, data: {method}, output}]}]})),
		{
			code: '(height as /* keep */ number) > 50 ? 50 : height;',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_ID, suggestions: [{messageId: SUGGESTION_ID, data: {method: 'min'}, output: 'Math.min(height as /* keep */ number, 50);'}]}],
		},
		...[
			'(height /* discard */ > 50) ? 50 : height;',
			'(/* discard */ height > 50) ? 50 : height;',
			'height > 50 ? 50 : (/* discard */ height);',
			'(/* keep */ read()) > 50 ? 50 : read();',
		].map(code => ({code, errors: [{messageId: MESSAGE_ID, suggestions: []}]})),
	],
});

nodeTest('comment-preserving min/max rewrites keep NaN and signed-zero changes manual', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'prefer-math-min-max': rule}}},
		rules: {'unicorn/prefer-math-min-max': 'error'},
	};
	for (const [code, expected, cases] of [
		['(/* keep */ value) > limit ? value : limit;', 'Math.max((/* keep */ value), limit);', [[5, 0, 5, 5], [-5, 0, 0, 0], [NaN, 0, 0, NaN]]],
		['(/* keep */ value) < limit ? value : limit;', 'Math.min((/* keep */ value), limit);', [[5, 0, 0, 0], [-5, 0, -5, -5], [-0, 0, 0, -0]]],
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].fix, undefined);
		t.assert.strictEqual(messages[0].suggestions?.length, 1);
		const {range, text} = messages[0].suggestions[0].fix;
		const suggested = code.slice(0, range[0]) + text + code.slice(range[1]);
		t.assert.strictEqual(suggested, expected);
		t.assert.deepStrictEqual(linter.verify(suggested, config), []);
		for (const [value, limit, originalResult, suggestedResult] of cases) {
			t.assert.strictEqual(runInNewContext(code, {value, limit}), originalResult);
			t.assert.strictEqual(runInNewContext(suggested, {value, limit}), suggestedResult);
		}
	}
});

test({
	valid: [
		'/** @param {bigint} input */ function run(input) { const value = input * 2n; return value > 0 ? value : 0; }',
		'/** @type {bigint} */ let value; value > 0 ? 0 : value;',
		'/** @param {bigint} value */ function run(value) { return value > 0 ? value : 0; }',
		'/** @param {number | bigint} value */ function run(value, limit) { return value < limit ? limit : value; }',
		'/** @param {?bigint} value */ function run(value) { return value <= 0 ? value : 0; }',
		'/** @param {bigint} [value] */ function run(value) { return value >= 0 ? 0 : value; }',
		'/** @param {number | bigint} limit */ function run(value, limit) { return limit > value ? limit : value; }',
		'/** @returns {number | bigint} */ function read() { return source; } let value = read(); value > 0 ? value : 0;',
		'/** @returns {number | bigint} */ function read() { return source; } function run(value = read()) { return value > 0 ? value : 0; }',
		'/** @param {number | bigint} input */ function run(input) { const value = -input; return value < 0 ? value : 0; }',
	],
	invalid: [
		['min', 'value > 0 ? 0 : value'],
		['max', 'value > 0 ? value : 0'],
	].map(([method, expression]) => ({
		code: `/** @param {number} value */ function run(value) { return ${expression}; }`,
		errors: [{
			messageId: MESSAGE_ID,
			suggestions: [{
				messageId: SUGGESTION_ID,
				data: {method},
				output: `/** @param {number} value */ function run(value) { return Math.${method}(value, 0); }`,
			}],
		}],
	})),
});

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			'/** @param {bigint} value */ function run(value) { return value > 0 ? value : 0; }',
			'/** @param {number | bigint} limit */ function run(value, limit) { return value < limit ? value : limit; }',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [{
			filename: 'file.ts',
			code: '/** @param {bigint} value */ function run(value: number) { return value > 0 ? value : 0; }',
			errors: [{
				messageId: MESSAGE_ID,
				suggestions: [{
					messageId: SUGGESTION_ID,
					data: {method: 'max'},
					output: '/** @param {bigint} value */ function run(value: number) { return Math.max(value, 0); }',
				}],
			}],
		}],
	});
}

nodeTest('documented bigint comparisons retain results without incompatible Math.min or Math.max suggestions', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'prefer-math-min-max': rule}}},
		rules: {'unicorn/prefer-math-min-max': 'error'},
	};
	for (const [code, expected] of [
		['/** @param {bigint} value */ function run(value) { return value < 0 ? value : 0; } run(-5n);', -5n],
		['/** @param {bigint} value */ function run(value) { return value > 0 ? value : 0; } run(5n);', 5n],
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(output), expected);
	}

	for (const method of ['min', 'max']) {
		t.assert.throws(() => runInNewContext(`Math.${method}(5n, 0)`), {name: 'TypeError'});
	}
});

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			'/** @returns {bigint} */ function read() { return source; } const value = read(); value > 0 ? value : 0;',
			'/** @param {() => bigint} read */ function run(read) { const value = read(); return value > 0 ? value : 0; }',
			'/** @type {bigint} */ const value = source; const alias = value; alias < 0 ? alias : 0;',
			'/** @returns {bigint} */ function read() { return source; } function run(value = read()) { return value > 0 ? value : 0; }',
			[
				'/** @param {bigint} first\n * @param {bigint} second */',
				'function run(first, second) { const value = condition ? first : second; return value > 0 ? value : 0; }',
			].join('\n'),
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [{
			code: '/** @returns {number} */ function read() { return source; } const value = read(); value > 0 ? value : 0;',
			filename: 'file.ts',
			errors: [{
				messageId: MESSAGE_ID,
				suggestions: [{
					messageId: SUGGESTION_ID,
					data: {method: 'max'},
					output: '/** @returns {number} */ function read() { return source; } const value = read(); Math.max(value, 0);',
				}],
			}],
		}],
	});
}

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [{
			code: '/** @returns {number} */ function read(): bigint { return source; } const value = read(); value > 0 ? value : 0;',
			filename: 'file.ts',
		}],
		invalid: [{
			code: '/** @returns {bigint} */ function read(): number { return source; } const value = read(); value > 0 ? value : 0;',
			filename: 'file.ts',
			errors: [{
				messageId: MESSAGE_ID,
				suggestions: [{
					messageId: SUGGESTION_ID,
					data: {method: 'max'},
					output: '/** @returns {bigint} */ function read(): number { return source; } const value = read(); Math.max(value, 0);',
				}],
			}],
		}],
	});
}

// `NaN` and signed zero give a different result, so these are only suggested
test({
	valid: [],
	invalid: [
		{
			code: 'const value = NaN; value > 0 ? value : 0;',
			errors: [{messageId: MESSAGE_ID, suggestions: [{messageId: SUGGESTION_ID, data: {method: 'max'}, output: 'const value = NaN; Math.max(value, 0);'}]}],
		},
		{
			code: 'const value = -0; value < 0 ? value : 0;',
			errors: [{messageId: MESSAGE_ID, suggestions: [{messageId: SUGGESTION_ID, data: {method: 'min'}, output: 'const value = -0; Math.min(value, 0);'}]}],
		},
	],
});

test.snapshot({
	valid: [
		'height > 10 ? height : 20',
		'height > 50 ? Math.min(50, height) : height',
		'foo ? foo : bar',

		// Ignore bigint
		'foo > 10n ? 10n : foo',
		'foo > BigInt(10) ? BigInt(10) : foo',

		// Ignore Date objects
		'new Date() > foo ? foo : new Date()',
		'foo > new Date(0) ? new Date(0) : foo',
		outdent`
			var now = new Date();
			var later = new Date();
			var value = now > later ? later : now;
		`,
		outdent`
			const start = new Date();
			var value = start > foo ? foo : start;
		`,
		// The declaration can be in an enclosing scope
		outdent`
			const start = new Date();
			function foo() {
				return start > foo ? foo : start;
			}
		`,
		outdent`
			const start = 'text';
			function foo() {
				return start > foo ? foo : start;
			}
		`,

		// Ignore bigint
		outdent`
			const a = BigInt(1);
			const value = a > 0 ? 0 : a;
		`,
		outdent`
			const a = -1n;
			const value = a > 0 ? 0 : a;
		`,
		outdent`
			function foo(a = BigInt(1)) {
				return a > 0 ? 0 : a;
			}
		`,

		// Ignore when you know it is a string
		outdent`
			function foo(a = 'string', b) {
			  return a > b ? a : b;
			}
		`,
	],
	invalid: [
		// Prefer `Math.min()`
		'height > 50 ? 50 : height',
		'height >= 50 ? 50 : height',
		'height < 50 ? height : 50',
		'height <= 50 ? height : 50',

		// Prefer `Math.min()`
		'height > maxHeight ? maxHeight : height',
		'height < maxHeight ? height : maxHeight',

		// Prefer `Math.min()`
		'window.height > 50 ? 50 : window.height',
		'window.height < 50 ? window.height : 50',

		// Prefer `Math.max()`
		'height > 50 ? height : 50',
		'height >= 50 ? height : 50',
		'height < 50 ? 50 : height',
		'height <= 50 ? 50 : height',

		// Prefer `Math.max()`
		'height > maxHeight ? height : maxHeight',
		'height < maxHeight ? maxHeight : height',

		// Edge test when there is no space between ReturnStatement and ConditionalExpression
		outdent`
			function a() {
				return +foo > 10 ? 10 : +foo
			}
		`,
		outdent`
			function a() {
				return+foo > 10 ? 10 : +foo
			}
		`,

		'(0,foo) > 10 ? 10 : (0,foo)',
		// Sequence expression on the right side of the comparison
		'foo > (0,bar) ? foo : (0,bar)',
		// `Number()` operands
		'Number(x) > 50 ? 50 : Number(x)',

		'foo.bar() > 10 ? 10 : foo.bar()',
		outdent`
			async function foo() {
				return await foo.bar() > 10 ? 10 : await foo.bar()
			}
		`,
		outdent`
			async function foo() {
				await(+foo > 10 ? 10 : +foo)
			}
		`,
		outdent`
			function foo() {
				return(foo.bar() > 10) ? 10 : foo.bar()
			}
		`,
		outdent`
			function* foo() {
				yield+foo > 10 ? 10 : +foo
			}
		`,
		'export default+foo > 10 ? 10 : +foo',

		'foo.length > bar.length ? bar.length : foo.length',
	],
});

// Reported, but not fixed, the replacement is rebuilt from both operands
test({
	valid: [],
	invalid: [
		{
			code: 'const value = height > // keep\n\t50 ? 50 : height;',
			errors: [{messageId: MESSAGE_ID, suggestions: []}],
		},
		{
			code: 'const value = height > /* keep */ 50 ? 50 : height;',
			errors: [{messageId: MESSAGE_ID, suggestions: []}],
		},
		{
			code: 'const value = height > 50 /* keep */ ? 50 : height;',
			errors: [{messageId: MESSAGE_ID, suggestions: []}],
		},
		{
			code: 'const value = height > 50 ? 50 /* keep */ : height;',
			errors: [{messageId: MESSAGE_ID, suggestions: []}],
		},
		{
			code: 'const value = height > 50 ? /* keep */ 50 : height;',
			errors: [{messageId: MESSAGE_ID, suggestions: []}],
		},
		{
			code: 'const value = height > 50 ? 50 : height;',
			errors: [{messageId: MESSAGE_ID, suggestions: [{messageId: SUGGESTION_ID, data: {method: 'min'}, output: 'const value = Math.min(height, 50);'}]}],
		},
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		outdent`
			function foo(a, b) {
				return (a as bigint) > b ? a : b;
			}
		`,
		outdent`
			function foo(a, b) {
				return (a as string) > b ? a : b;
			}
		`,
		outdent`
			function foo(a, b) {
				return (<bigint>a) > b ? a : b;
			}
		`,
		outdent`
			function foo(a, b) {
				return (<string>a) > b ? a : b;
			}
		`,
		outdent`
			function foo(a: string, b) {
				return a > b ? a : b;
			}
		`,
		outdent`
			function foo(a, b: string) {
				return a > b ? a : b;
			}
		`,
		outdent`
			function foo(a: bigint, b: bigint) {
				return a > b ? a : b;
			}
		`,
		outdent`
			function foo(a: Date, b: Date) {
				return a > b ? a : b;
			}
		`,
		outdent`
			var foo: Date;
			var bar: Date;
			var value = foo > bar ? bar : foo;
		`,
		outdent`
			var foo = 10;
			var bar = '20';

			var value = foo > bar ? bar : foo;
		`,
		outdent`
			var foo = 10;
			var bar: string;

			var value = foo > bar ? bar : foo;
		`,
		outdent`
			function foo(a, b) {
				return (a as string)! > b ? (a as string)! : b;
			}
		`,
		outdent`
			function foo(a, b) {
				return (<string>a)! > b ? (<string>a)! : b;
			}
		`,
		outdent`
			function foo(a, b) {
				return (a as Foo) > b ? a : b;
			}
		`,
		outdent`
			function foo(a, b) {
				return (a as number) > b ? a : b;
			}
		`,
		outdent`
			function foo(a, b) {
				return (a as unknown as number) > b ? a : b;
			}
		`,
		outdent`
			var foo = 10;

			var value = foo > bar ? bar : foo;
		`,
		outdent`
			var foo = 10;
			var bar = 20;

			var value = foo > bar ? bar : foo;
		`,
		outdent`
			function foo(a, b) {
				return (a as number) > b ? (a as number) : b;
			}
		`,
		outdent`
			function foo(a, b) {
				return (<number>a) > b ? (<number>a) : b;
			}
		`,
		outdent`
			function foo(a, b) {
				return a! > b ? a! : b;
			}
		`,
		outdent`
			function foo(a, b) {
				return (a as Number) > b ? a : b;
			}
		`,
	],
	invalid: [
		outdent`
			var foo: number;
			var bar: number;

			var value = foo > bar ? bar : foo;
		`,
	],
});

// The same operand is written on both sides, so the source evaluates it twice and the rewrite only once
test({
	valid: [
		'const a = [f()] > 0 ? 0 : [f()];',
		'const a = ({a: f()}) > 0 ? 0 : ({a: f()});',
		// A template literal with an expression can run `toString()`
		// eslint-disable-next-line no-template-curly-in-string
		'const a = `${x}` > 0 ? 0 : `${x}`;',
		'const a = `1` > 0 ? 0 : `1`;',
		// A function body does not run where it is written
		'const a = [() => f()] > 0 ? 0 : [() => f()];',
	],
	invalid: [
		...[
			'const a = f() > 0 ? f() : 0;',
			// The effectful call hides inside a wrapper that evaluates its operands eagerly
			'const a = (x++, y) > 0 ? 0 : (x++, y);',
			'const a = (x = 1, y) > 0 ? 0 : (x = 1, y);',
			'const a = (x || f()) > 0 ? 0 : (x || f());',
			'const a = (x ? f() : g()) > 0 ? 0 : (x ? f() : g());',
		].map(code => ({code, errors: [{messageId: MESSAGE_ID, suggestions: []}]})),
		// A wrapper without an effect can be suggested
		{
			code: 'const a = (x, y) > 0 ? 0 : (x, y);',
			errors: [{messageId: MESSAGE_ID, suggestions: [{messageId: SUGGESTION_ID, data: {method: 'min'}, output: 'const a = Math.min((x, y), 0);'}]}],
		},
		// An import binding has no initializer to check
		{
			code: 'import foo from "foo"; const a = foo > 0 ? 0 : foo;',
			errors: [{messageId: MESSAGE_ID, suggestions: [{messageId: SUGGESTION_ID, data: {method: 'min'}, output: 'import foo from "foo"; const a = Math.min(foo, 0);'}]}],
		},
	],
});

// Inferred callback parameters must not be assumed to be numbers.
for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			'const bigIntMax = (...args: bigint[]) => args.reduce((previous, current) => current > previous ? current : previous, BigInt(Number.MIN_SAFE_INTEGER));',
			'function maximum(first: any, second: any) { return first > second ? first : second; }',
			'function maximum(first: unknown, second: unknown) { return first > second ? first : second; }',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [{
			filename: 'file.ts',
			code: 'function maximum(first: number, second: number) { return first > second ? first : second; }',
			errors: [{
				messageId: MESSAGE_ID,
				suggestions: [{
					messageId: SUGGESTION_ID,
					data: {method: 'max'},
					output: 'function maximum(first: number, second: number) { return Math.max(first, second); }',
				}],
			}],
		}],
	});
}

test({
	valid: [
		'/** @param {string} value */ function run(value) { return value > 0 ? value : 0; }',
		'/** @param {boolean} value */ function run(value) { return value < 0 ? value : 0; }',
		'/** @param {Date} value */ function run(value) { return value > 0 ? value : 0; }',
		'/** @param {number | string} value */ function run(value) { return value > 0 ? value : 0; }',
	],
	invalid: [],
});

test({
	testerOptions: {languageOptions: {parser: parsers.typescript}},
	valid: [
		'function maximum(first, second) { return first > second ? first : second; }',
		'function maximum(value: number | undefined) { return value > 0 ? value : 0; }',
		'function maximum(value: Number) { return value > 0 ? value : 0; }',
		'function maximum(...values: number[]) { return values.reduce((first, second) => first > second ? first : second); }',
	].map(code => ({code, filename: 'file.ts'})),
	invalid: [
		{
			filename: 'file.js',
			code: 'function maximum(first, second) { return first > second ? first : second; }',
			errors: [{messageId: MESSAGE_ID, suggestions: [{messageId: SUGGESTION_ID, data: {method: 'max'}, output: 'function maximum(first, second) { return Math.max(first, second); }'}]}],
		},
		...['file.ts', 'file.tsx', 'file.mts', 'file.cts'].map(filename => ({
			filename,
			code: 'const value = 1; value > 0 ? value : 0;',
			errors: [{messageId: MESSAGE_ID, suggestions: [{messageId: SUGGESTION_ID, data: {method: 'max'}, output: 'const value = 1; Math.max(value, 0);'}]}],
		})),
	],
});

test({
	testerOptions: {languageOptions: {parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}}},
	valid: [],
	invalid: [{
		filename: 'file.ts',
		code: 'function maximum(...values: number[]) { return values.reduce((first, second) => first > second ? first : second); }',
		errors: [{
			messageId: MESSAGE_ID,
			suggestions: [{
				messageId: SUGGESTION_ID,
				data: {method: 'max'},
				output: 'function maximum(...values: number[]) { return values.reduce((first, second) => Math.max(first, second)); }',
			}],
		}],
	}],
});

test({
	valid: [
		'"10" > value ? "10" : value;',
		'`10` < value ? `10` : value;',
		'true > value ? true : value;',
		'Boolean(input) > value ? Boolean(input) : value;',
		'String(input) < value ? String(input) : value;',
		'const values = []; values > value ? values : value;',
		'[] < value ? [] : value;',
	],
	invalid: [],
});

test.snapshot({
	testerOptions: {languageOptions: {parser: parsers.typescript}},
	valid: [],
	invalid: [
		'function minimum(value, limit: number) { return (value as number) < limit ? value : limit; }',
		'function minimum(value, limit: number) { return (<number>value) < limit ? value : limit; }',
		'function minimum(value: number, limit: number) { return value! < limit ? value! : limit; }',
		'function minimum(value: number, limit: number) { return (value satisfies number) < limit ? (value satisfies number) : limit; }',
	],
});

test({
	valid: [
		'null > value ? null : value;',
		'undefined < value ? value : undefined;',
		'void 0 > value ? void 0 : value;',
	],
	invalid: [],
});

// Object values must not be replaced with their numeric coercion.
test({
	valid: [
		...[
			'({})',
			'/pattern/',
			'(() => 1)',
			'(function () {})',
			'(class {})',
			'new Number(1)',
			'new CustomValue()',
			'null',
			'undefined',
			'void effect()',
		].flatMap(value => [
			`${value} > other ? ${value} : other;`,
			`const value = ${value}; const alias = value; alias < other ? alias : other;`,
		]),
		'const value = condition ? {} : 1; value > other ? value : other;',
		'const value = (effect(), {}); value < other ? value : other;',
	],
	invalid: [],
});

test({
	valid: [],
	invalid: [
		'class { static value = effect(); }',
		'class { static { effect(); } }',
		'class extends effect() {}',
		'class { [effect()]() {} }',
	].map(classExpression => ({
		code: `[${classExpression}].length > 0 ? [${classExpression}].length : 0;`,
		errors: [{messageId: MESSAGE_ID, suggestions: []}],
	})),
});

nodeTest('class static effects retain their original evaluation count', t => {
	const code = '[class { static { effect(); } }].length > 0 ? [class { static { effect(); } }].length : 0;';
	const messages = new Linter().verify(code, {
		plugins: {unicorn: {rules: {'prefer-math-min-max': rule}}},
		rules: {'unicorn/prefer-math-min-max': 'error'},
	});
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].messageId, MESSAGE_ID);
	t.assert.strictEqual(messages[0].suggestions, undefined);
	let effectCount = 0;
	const result = runInNewContext(code, {
		effect() {
			effectCount++;
		},
	});
	t.assert.strictEqual(result, 1);
	t.assert.strictEqual(effectCount, 2);
});

// Defaults and mutable initializers use the same non-number checks as operands.
test({
	valid: [
		...['[]', '{}', 'new Date()', 'String(input)', 'Boolean(input)', 'undefined', 'void effect()'].flatMap(value => [
			`function minimum(value = ${value}) { return value > 0 ? 0 : value; }`,
			`let value = ${value}; value > 0 ? 0 : value;`,
			`var value = ${value}; value > 0 ? 0 : value;`,
		]),
	],
	invalid: [
		...['1', 'input'].map(value => ({
			code: `function minimum(value = ${value}) { return value > 0 ? 0 : value; }`,
			errors: [{
				messageId: MESSAGE_ID,
				suggestions: [{
					messageId: SUGGESTION_ID,
					data: {method: 'min'},
					output: `function minimum(value = ${value}) { return Math.min(value, 0); }`,
				}],
			}],
		})),
	],
});

test({
	valid: [],
	invalid: [
		'[...values].length > 0 ? [...values].length : 0;',
		'(delete object.a, object.b) > (delete object.b, 0) ? (delete object.a, object.b) : (delete object.b, 0);',
		{
			code: '[<Component />].length > 0 ? [<Component />].length : 0;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
	].map(testCase => ({
		...(typeof testCase === 'string' ? {code: testCase} : testCase),
		errors: [{messageId: MESSAGE_ID, suggestions: []}],
	})),
});

nodeTest('spread iteration and deletion keep their original effects', t => {
	const config = {
		plugins: {unicorn: {rules: {'prefer-math-min-max': rule}}},
		rules: {'unicorn/prefer-math-min-max': 'error'},
	};
	let iterations = 0;
	const cases = [
		{
			code: '[...values].length > 0 ? [...values].length : 0;',
			context: {
				values: {
					* [Symbol.iterator]() {
						iterations++;
						yield 1;
					},
				},
			},
			expected: 1,
		},
		{
			code: '(delete object.a, object.b) > (delete object.b, 0) ? (delete object.a, object.b) : (delete object.b, 0);',
			context: {object: {a: 1, b: 1}},
			expected: undefined,
		},
	];
	for (const {code, context, expected} of cases) {
		const messages = new Linter().verify(code, config);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].suggestions, undefined);
		t.assert.strictEqual(runInNewContext(code, context), expected);
	}

	t.assert.strictEqual(iterations, 2);
});

test.snapshot({
	valid: [],
	invalid: [
		'class Example extends Base { maximum() { return this.value > super.value ? this.value : super.value; } }',
		'class Example { #value; minimum() { return this.#value < 0 ? this.#value : 0; } }',
	],
});

// A destructuring initializer describes the container, not the extracted value.
for (const languageOptions of [
	{},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: languageOptions.parser
			? [
				'const {value} = {value: "text"}; value > 0 ? value : 0;',
				'const [value] = [1n]; value > 0 ? value : 0;',
			].map(code => ({code, filename: 'file.ts'}))
			: [],
		invalid: [
			'const {value} = {value: 1};',
			'const [value] = [1];',
		].map(declaration => ({
			filename: languageOptions.parser ? 'file.ts' : 'file.js',
			code: `${declaration} value > 0 ? value : 0;`,
			errors: [{
				messageId: MESSAGE_ID,
				suggestions: [{
					messageId: SUGGESTION_ID,
					data: {method: 'max'},
					output: `${declaration} Math.max(value, 0);`,
				}],
			}],
		})),
	});
}
