import test from 'node:test';
import outdent from 'outdent';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

const MESSAGE_ID_SUBSTR = 'substr';
const MESSAGE_ID_SUBSTRING = 'substring';

const errorsSubstr = [
	{
		messageId: MESSAGE_ID_SUBSTR,
	},
];
const errorsSubstring = [
	{
		messageId: MESSAGE_ID_SUBSTRING,
	},
];

ruleTest({
	valid: [
		'const substr = foo.substr',
		'const substring = foo.substring',

		'foo.slice()',
		'foo.slice(0)',
		'foo.slice(1, 2)',
		'foo?.slice(1, 2)',
		'foo?.slice?.(1, 2)',
		'foo?.bar.baz.slice(1, 2)',
		'foo.slice(-3, -2)',
		'foo.substring(0, 1)',
		'foo.substring(1, 2)',
		'foo.substring(2, 1)',
		'"foo".substring(1, 2)',
		'"foo".substring(2, 1)',
		'foo.substring(index, index + 1)',
		'foo.substring(index, 1 + index)',
		'foo.substring(index - 1, index)',
		'foo.substring(index + 1, index)',
		'foo.substring(1 + index, index)',
		'foo.substring(index, /* comment */ index + 1)',
		'foo.substring(index, index + /* comment */ 1)',
		'foo?.substring(index, index + 1)',
		'foo.substring?.(index, index + 1)',
		'foo.substring((( index )), (( index )) + 1)',
		'foo.substring((( index )) - 1, (( index )))',
		{
			code: 'function foo(collection: {substring(start: number): string}) { collection.substring(1); }',
			languageOptions: {parser: parsers.typescript},
		},
	],

	invalid: [
		{
			code: 'const modes = new Set(["foo"]); modes.clear(); foo.substr(modes.size ? 0 : 1, length);',
			errors: errorsSubstr,
		},
		{
			code: 'const modes = new Set(["foo"]); modes.clear(); foo.substr((modes.size ? 0 : 1) as number, length);',
			errors: errorsSubstr,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const modes = new Set(["foo"]); modes.clear(); foo.substr(+(modes.size ? 0 : 1), length);',
			errors: errorsSubstr,
		},
		{
			code: 'const modes = new Set(["foo"]); modes.clear(); foo.substr((modes.size && 0) || index, length);',
			errors: errorsSubstr,
		},
		{
			code: 'const object = {value: true}; Object.defineProperty(object, "value", {get() { return 0; }}); foo.substr(object.value ? 0 : index, length);',
			errors: errorsSubstr,
		},
		{
			code: 'foo.substr()',
			output: 'foo.slice()',
			errors: errorsSubstr,
		},
		{
			code: 'foo?.substr()',
			output: 'foo?.slice()',
			errors: errorsSubstr,
		},
		{
			code: 'foo.bar?.substring()',
			output: 'foo.bar?.slice()',
			errors: errorsSubstring,
		},
		{
			code: 'foo?.[0]?.substring()',
			output: 'foo?.[0]?.slice()',
			errors: errorsSubstring,
		},
		{
			code: 'foo.bar.substr?.()',
			output: 'foo.bar.slice?.()',
			errors: errorsSubstr,
		},
		{
			code: 'foo.bar?.substring?.()',
			output: 'foo.bar?.slice?.()',
			errors: errorsSubstring,
		},
		{
			code: 'foo.bar?.baz?.substr()',
			output: 'foo.bar?.baz?.slice()',
			errors: errorsSubstr,
		},
		{
			code: 'foo.bar?.baz.substring()',
			output: 'foo.bar?.baz.slice()',
			errors: errorsSubstring,
		},
		{
			code: 'foo.bar.baz?.substr()',
			output: 'foo.bar.baz?.slice()',
			errors: errorsSubstr,
		},
		{
			code: '"foo".substr()',
			output: '"foo".slice()',
			errors: errorsSubstr,
		},
		{
			code: '"foo".substr(bar.length, Math.min(baz, 100))',
			errors: errorsSubstr,
		},
		{
			code: '"foo".substr(1, "abc".length)',
			errors: errorsSubstr,
		},
		{
			code: '"foo".substr("1", 2)',
			errors: errorsSubstr,
		},
		{
			code: outdent`
				const length = 123;
				"foo".substr(1, length)
			`,
			errors: errorsSubstr,
		},
		{
			code: outdent`
				const length = 123;
				"foo".substr(0, length)
			`,
			output: outdent`
				const length = 123;
				"foo".slice(0, Math.max(0, length === undefined ? Infinity : length))
			`,
			errors: errorsSubstr,
		},
		{
			code: outdent`
				const length = 123;
				"foo".substr('0', length)
			`,
			errors: errorsSubstr,
		},
		{
			code: '"foo".substr(0, -1)',
			output: '"foo".slice(0, 0)',
			errors: errorsSubstr,
		},
		{
			code: '"foo".substr(0, "foo".length)',
			output: '"foo".slice(0, "foo".length)',
			errors: errorsSubstr,
		},
		{
			code: outdent`
				const length = 123;
				"foo".substr(1, length - 4)
			`,
			errors: errorsSubstr,
		},
		{
			code: '"foo".substr(1, length)',
			errors: errorsSubstr,
		},
		{
			code: outdent`
				const uri = 'foo';
				((uri || '')).substr(1)
			`,
			output: outdent`
				const uri = 'foo';
				((uri || '')).slice(1)
			`,
			errors: errorsSubstr,
		},

		{
			code: 'foo.substr(start)',
			output: 'foo.slice(start)',
			errors: errorsSubstr,
		},
		{
			code: '"foo".substr(1)',
			output: '"foo".slice(1)',
			errors: errorsSubstr,
		},
		{
			code: 'foo.substr(start, length)',
			errors: errorsSubstr,
		},
		{
			code: '"foo".substr(1, 2)',
			output: '"foo".slice(1, 3)',
			errors: errorsSubstr,
		},
		{
			// Zero-length: end equals start
			code: 'foo.substr(1, 0)',
			output: 'foo.slice(1, 1)',
			errors: errorsSubstr,
		},
		// Extra arguments
		{
			code: 'foo.substr(1, 2, 3)',
			errors: errorsSubstr,
		},
		// #700
		{
			code: '"Sample".substr(0, "Sample".lastIndexOf("/"))',
			errors: errorsSubstr,
		},
		{
			code: 'foo.substr(0, foo.length - 2)',
			output: 'foo.slice(0, -2)',
			errors: errorsSubstr,
		},
		{
			code: 'foo?.substr(0, foo.length - 2)',
			output: 'foo?.slice(0, -2)',
			errors: errorsSubstr,
		},
		{
			code: 'foo.substr(0, (foo.length - 2))',
			output: 'foo.slice(0, -2)',
			errors: errorsSubstr,
		},
		{
			code: '"foo".substr(0, "foo".length - 2)',
			output: '"foo".slice(0, -2)',
			errors: errorsSubstr,
		},
		{
			code: 'foo.bar.substr(0, foo.bar.length - 2)',
			output: 'foo.bar.slice(0, Math.max(0, foo.bar.length - 2 === undefined ? Infinity : foo.bar.length - 2))',
			errors: errorsSubstr,
		},
		{
			code: 'foo.substr(0, foo.length - count)',
			output: 'foo.slice(0, Math.max(0, foo.length - count === undefined ? Infinity : foo.length - count))',
			errors: errorsSubstr,
		},
		{
			code: 'foo.substr(0, foo.length - 0)',
			output: 'foo.slice(0, Math.max(0, foo.length - 0 === undefined ? Infinity : foo.length - 0))',
			errors: errorsSubstr,
		},
		{
			code: 'foo.substr(0, foo.length - 2.5)',
			output: 'foo.slice(0, Math.max(0, foo.length - 2.5 === undefined ? Infinity : foo.length - 2.5))',
			errors: errorsSubstr,
		},
		{
			code: 'foo.substr(0, foo.length - -1)',
			output: 'foo.slice(0, Math.max(0, foo.length - -1 === undefined ? Infinity : foo.length - -1))',
			errors: errorsSubstr,
		},
		{
			code: 'foo.substr(0, bar.length - 2)',
			output: 'foo.slice(0, Math.max(0, bar.length - 2 === undefined ? Infinity : bar.length - 2))',
			errors: errorsSubstr,
		},
		{
			code: 'foo.substr(0, foo.length - /* comment */ 2)',
			output: 'foo.slice(0, Math.max(0, foo.length - /* comment */ 2 === undefined ? Infinity : foo.length - /* comment */ 2))',
			errors: errorsSubstr,
		},
		{
			code: 'foo.substr(0, /* comment */ foo.length - 2)',
			output: 'foo.slice(0, /* comment */ Math.max(0, foo.length - 2 === undefined ? Infinity : foo.length - 2))',
			errors: errorsSubstr,
		},
		{
			code: 'foo.substr(0, (/* comment */ foo.length - 2))',
			output: 'foo.slice(0, Math.max(0, (/* comment */ foo.length - 2) === undefined ? Infinity : (/* comment */ foo.length - 2)))',
			errors: errorsSubstr,
		},
		{
			code: 'foo.substr(0, (/* comment */ (foo.length - 2)))',
			output: 'foo.slice(0, Math.max(0, (/* comment */ (foo.length - 2)) === undefined ? Infinity : (/* comment */ (foo.length - 2))))',
			errors: errorsSubstr,
		},
		{
			code: 'foo.substr(0, /* comment */ (foo.length - 2))',
			output: 'foo.slice(0, /* comment */ Math.max(0, (foo.length - 2) === undefined ? Infinity : (foo.length - 2)))',
			errors: errorsSubstr,
		},

		{
			code: 'foo.substring()',
			output: 'foo.slice()',
			errors: errorsSubstring,
		},
		{
			code: '"foo".substring()',
			output: '"foo".slice()',
			errors: errorsSubstring,
		},
		{
			code: '"foo".substring(1)',
			output: '"foo".slice(1)',
			errors: errorsSubstring,
		},
		{
			code: '"foo".substring(2, 4)',
			output: '"foo".slice(2, 4)',
			errors: errorsSubstring,
		},
		{
			code: '"foo".substring(4, 2)',
			output: '"foo".slice(2, 4)',
			errors: errorsSubstring,
		},
		{
			code: '"foo".substring(-1, -5)',
			output: '"foo".slice(0, 0)',
			errors: errorsSubstring,
		},
		{
			code: '"foo".substring(-1, 2)',
			output: '"foo".slice(0, 2)',
			errors: errorsSubstring,
		},
		{
			code: '"foo".substring(length)',
			output: '"foo".slice(Math.max(0, length))',
			errors: errorsSubstring,
		},
		{
			code: '"foo".substring("fo".length)',
			output: '"foo".slice("fo".length)',
			errors: errorsSubstring,
		},
		{
			code: '"foo".substring(0, length)',
			output: '"foo".slice(0, Math.max(0, length === undefined ? Infinity : length))',
			errors: errorsSubstring,
		},
		{
			code: '"foo".substring(length, 0)',
			output: '"foo".slice(0, Math.max(0, length))',
			errors: errorsSubstring,
		},

		{
			code: 'foo.substring(start)',
			output: 'foo.slice(Math.max(0, start))',
			errors: errorsSubstring,
		},
		{
			code: 'foo.substring(start, end)',
			errors: errorsSubstring,
		},
		{
			code: '"foo".substring(1, 3)',
			output: '"foo".slice(1, 3)',
			errors: errorsSubstring,
		},
		// Extra arguments
		{
			code: 'foo.substring(1, 2, 3)',
			errors: errorsSubstring,
		},
	],
});

ruleTest.typescript({
	valid: [],
	invalid: [
		{
			code: outdent`
				function foo() {
					return (bar as string).substr(3);
				}
			`,
			output: outdent`
				function foo() {
					return (bar as string).slice(3);
				}
			`,
			errors: errorsSubstr,
		},
		{
			code: outdent`
				function foo() {
					return ((bar as string)).substring(3);
				}
			`,
			output: outdent`
				function foo() {
					return ((bar as string)).slice(3);
				}
			`,
			errors: errorsSubstring,
		},
		{
			code: outdent`
				const value: 'foo' = 'foo';
				value.substring(1);
			`,
			output: outdent`
				const value: 'foo' = 'foo';
				value.slice(1);
			`,
			errors: errorsSubstring,
		},
	],
});

ruleTest.snapshot({
	valid: [],
	invalid: [
		outdent`
			/* 1 */ (( /* 2 */ 0 /* 3 */, /* 4 */ foo /* 5 */ )) /* 6 */
				. /* 7 */ substring /* 8 */ (
					/* 9 */ (( /* 10 */ bar /* 11 */ )) /* 12 */,
					/* 13 */ (( /* 14 */ 0 /* 15 */ )) /* 16 */,
					/* 17 */
				)
			/* 18 */
		`,
		'foo.substr(0, ...bar)',
		'foo.substr(...bar)',
		'foo.substr(0, (100, 1))',
		'foo.substr(0, 1, extraArgument)',
		'foo.substr((0, bar.length), (0, baz.length))',
		// TODO: Fix this
		// 'foo.substr(await 1, await 2)',
		'foo.substring((10, 1), 0)',
		'foo.substring(0, (10, 1))',
		'foo.substring(0, await 1)',
		'foo.substring((10, bar))',
		outdent`
			const string = "::";
			const output = string.substr(-2, 2);
		`,
		// `substr()` runs `ToInteger` on each argument before adding them
		'foo.substr(0.5, 0.5)',
		'foo.substr(1.5, 2.5)',
		'foo.substr(-1.5, 2.5)',
		// A negated unknown value is unknown, not `NaN`
		'foo.substring(1, -n)',
		'foo.substring(1, -Infinity)',
		'foo.substring(1, -foo.length)',
		// `replaceArgument()` would drop a comment inside the parentheses
		'foo.substring((/* keep */ 5), 2)',
		'foo.substring((/* keep */ -1))',
		'foo.substring((/* keep */ -1), 3)',
		'foo.substr(1, (/* keep */ 2))',
		'foo.substr(0, (/* keep */ -1))',
		'foo.substring(0, (/* keep */ 2))',
		// `Math.max(0, …)` must not turn a missing or `undefined` end into `0`
		'foo.substr(0, undefined)',
		'foo.substring(0, undefined)',
		'foo.substring(0, null)',
		'foo.substring(0, NaN)',
	],
});

// Anything that binds looser than `===` would swallow it instead of being an operand of it
ruleTest({
	valid: [],
	invalid: [
		...[
			['foo.substring(0, a || b)', 'foo.slice(0, Math.max(0, (a || b) === undefined ? Infinity : (a || b)))'],
			['foo.substr(0, a && b)', 'foo.slice(0, Math.max(0, (a && b) === undefined ? Infinity : (a && b)))'],
			['foo.substring(0, () => a || b)', 'foo.slice(0, Math.max(0, (() => a || b) === undefined ? Infinity : (() => a || b)))'],
			['foo.substr(0, () => {})', 'foo.slice(0, Math.max(0, (() => {}) === undefined ? Infinity : (() => {})))'],
			['foo.substring(0, a ? b : c)', 'foo.slice(0, Math.max(0, (a ? b : c) === undefined ? Infinity : (a ? b : c)))'],
		].map(([code, output]) => ({code, output, errors: 1})),
		// The replacement reads the end twice, so an end with a side effect is not rewritten
		...[
			'foo.substring(0, a = b)',
			'async function f() { foo.substring(0, await a || b); }',
			'function * f() { foo.substring(0, yield a || b); }',
		].map(code => ({code, errors: 1})),
		// Already parenthesized in the source, no second pair is added
		{
			code: 'foo.substring(0, (a || b))',
			output: 'foo.slice(0, Math.max(0, (a || b) === undefined ? Infinity : (a || b)))',
			errors: 1,
		},
		// A nullish expression needs the parentheses, the others bind tighter than `===`
		...[
			['foo.substring(0, a ?? b)', 'foo.slice(0, Math.max(0, (a ?? b) === undefined ? Infinity : (a ?? b)))'],
			['foo.substring(0, a + b)', 'foo.slice(0, Math.max(0, a + b === undefined ? Infinity : a + b))'],
			['foo.substring(0, a.b)', 'foo.slice(0, Math.max(0, a.b === undefined ? Infinity : a.b))'],
			['foo.substring(0, -a)', 'foo.slice(0, Math.max(0, -a === undefined ? Infinity : -a))'],
		].map(([code, output]) => ({code, output, errors: 1})),
	],
});

// `substring(x, 0)` swaps the arguments, `x` was the start where `undefined` means `0`, not "to the end", and it is read only once
ruleTest({
	valid: [],
	invalid: [
		...[
			['foo.substring(a, 0)', 'foo.slice(0, Math.max(0, a))'],
			['foo.substring(a || b, 0)', 'foo.slice(0, Math.max(0, a || b))'],
			['foo.substring(a, 0.0)', 'foo.slice(0, Math.max(0, a))'],
			['foo.substring(bar(), 0)', 'foo.slice(0, Math.max(0, bar()))'],
			['foo.substring((a, b), 0)', 'foo.slice(0, Math.max(0, (a, b)))'],
		].map(([code, output]) => ({code, output, errors: 1})),
		// The first argument is replaced by `0`, so a comment inside its parentheses is not fixed
		{
			code: 'foo.substring((a /* comment */), 0)',
			errors: 1,
		},
		// Not swapped, the argument keeps the role of the end
		{
			code: 'foo.substring(0, a)',
			output: 'foo.slice(0, Math.max(0, a === undefined ? Infinity : a))',
			errors: 1,
		},
	],
});

// `substring()` and `substr()` read an `undefined` end as "to the end" and a `null` end as `0`, so only `undefined` is turned into `Infinity`. `??` would coalesce `null` too and rewrite it to the whole string.
test('a `null` end is not rewritten to the whole string', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: plugin},
		rules: {'unicorn/prefer-string-slice': 'error'},
	};

	for (const [code, expectedEnd] of [
		['foo.substring(0, null);', 'Math.max(0, null === undefined ? Infinity : null)'],
		['foo.substr(0, null);', 'Math.max(0, null === undefined ? Infinity : null)'],
		['const n = null; foo.substring(0, n);', 'Math.max(0, n === undefined ? Infinity : n)'],
		// A missing or undefined end is still "to the end"
		['foo.substring(0, undefined);', 'Math.max(0, undefined === undefined ? Infinity : undefined)'],
		['foo.substring(0, n);', 'Math.max(0, n === undefined ? Infinity : n)'],
	]) {
		const result = linter.verifyAndFix(code, config, 'index.js');

		t.assert.strictEqual(result.fixed, true, `should fix \`${code}\``);
		t.assert.strictEqual(result.output.includes(expectedEnd), true, `expected \`${expectedEnd}\` in \`${result.output}\``);
	}
});

// The replacement reads the end twice, so an end with a side effect, like a call, is left alone rather than evaluated twice.
test('an end with a side effect is not rewritten', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: plugin},
		rules: {'unicorn/prefer-string-slice': 'error'},
	};

	for (const code of [
		'foo.substring(0, getEnd());',
		'foo.substring(0, end());',
		'foo.substring(0, a++);',
		'foo.substr(0, getEnd());',
	]) {
		const problem = linter.verify(code, config).find(problem => !problem.fatal);

		t.assert.strictEqual(problem.fix, undefined, `should not fix \`${code}\``);
	}
});
