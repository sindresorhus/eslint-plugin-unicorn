import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		'function foo(value) { return typeof value === `undef${suffix}`; }', // eslint-disable-line no-template-curly-in-string
		'function foo(value) { return typeof value === tag`undefined`; }',
	],
	invalid: [
		{
			code: 'typeof a.b === `undefined`',
			output: 'a.b === undefined',
			errors: 1,
		},
		{
			code: 'function foo(value) { return typeof value === `undef\\u0069ned`; }',
			output: 'function foo(value) { return value === undefined; }',
			errors: 1,
		},
	],
});

test({
	valid: [],
	invalid: [
		...['return', 'throw'].map(keyword => ({
			code: `function check(value, ready) { ${keyword} typeof /* keep\n*/ value === 'undefined' && ready; }`,
			output: `function check(value, ready) { ${keyword} ( /* keep\n*/ value === undefined && ready); }`,
			errors: 1,
		})),
		{
			code: 'function* check(value, ready) { yield typeof /* keep\n*/ value === \'undefined\' && ready; }',
			errors: [{messageId: 'no-typeof-undefined/error', suggestions: []}],
		},
		...['/* keep\n*/', '// keep\n'].map(comment => ({
			code: `function* check(value) { yield typeof ${comment} value === 'undefined'; }`,
			errors: [{messageId: 'no-typeof-undefined/error', suggestions: []}],
		})),
		{
			code: 'function* check() { yield typeof // keep\nmissing === \'undefined\'; }',
			options: [{checkGlobalVariables: true}],
			errors: [{messageId: 'no-typeof-undefined/error', suggestions: []}],
		},
		...[
			['yield (typeof // keep\nvalue === \'undefined\')', 'yield (// keep\nvalue === undefined)'],
			['yield (typeof // keep\nvalue) === \'undefined\'', 'yield (// keep\nvalue) === undefined'],
			['yield* typeof // keep\nvalue === \'undefined\'', 'yield* // keep\nvalue === undefined'],
			['yield typeof value === \'undefined\'', 'yield value === undefined'],
		].map(([expression, replacement]) => ({
			code: `function* check(value) { ${expression}; }`,
			output: `function* check(value) { ${replacement}; }`,
			errors: 1,
		})),
	],
});

const ambientVariableComparisons = [
	outdent`
		declare const COMPILE_TIME_FLAG: boolean | undefined;
		if (typeof COMPILE_TIME_FLAG !== 'undefined' && COMPILE_TIME_FLAG) {
			console.log('Compiled');
		}
	`,
	'declare let foo: unknown; typeof foo === "undefined";',
	'declare var foo: unknown; typeof foo == "undefined";',
	'declare const foo: unknown; function bar() { return typeof (foo) != "undefined"; }',
	'declare var foo: unknown; declare var foo: unknown; typeof foo === "undefined";',
	'declare const foo: unknown; typeof (foo as unknown) === "undefined";',
	'declare const foo: unknown; typeof <unknown>foo === "undefined";',
	'declare const foo: unknown; typeof foo! === "undefined";',
	'declare const foo: unknown; typeof (foo satisfies unknown) === "undefined";',
	'declare const foo: unknown; typeof ((foo as unknown)!) === "undefined";',
	'declare const foo: <T>() => T; typeof foo<string> === "undefined";',
	outdent`
		declare const Foo: unknown;
		function bar() {
			interface Foo {}
			return typeof Foo === "undefined";
		}
	`,
	outdent`
		declare const foo: unknown;
		@((typeof foo === "undefined") ? decorator : decorator)
		class Foo {}
	`,
	'interface Foo {} declare const Foo: unknown; typeof Foo === "undefined";',
];

const unresolvedValueWithTypeOnlyShadow = outdent`
	function bar() {
		interface missing {}
		return typeof missing === "undefined";
	}
`;

test.snapshot({
	testerOptions: {
		languageOptions: {parser: parsers.typescript},
	},
	valid: [
		...ambientVariableComparisons.flatMap(code => [code, {code, options: [{checkGlobalVariables: true}]}]),
		'typeof (undefinedVariableIdentifier as unknown) === "undefined";',
		'typeof undefinedVariableIdentifier<string> === "undefined";',
		unresolvedValueWithTypeOnlyShadow,
	],
	invalid: [
		{
			code: 'declare const foo: unknown; function bar(foo: unknown) { return typeof (foo as unknown) === "undefined"; }',
			options: [{checkGlobalVariables: true}],
		},
		'declare var foo: unknown; var foo: unknown; typeof foo === "undefined";',
		'interface Foo {} const Foo = 1; typeof Foo === "undefined";',
		'import foo from "foo"; typeof foo === "undefined";',
		'declare const foo: {bar?: string}; typeof foo.bar === "undefined";',
		{
			code: 'typeof (undefinedVariableIdentifier as unknown) === "undefined";',
			options: [{checkGlobalVariables: true}],
		},
		{
			code: 'typeof undefinedVariableIdentifier<string> === "undefined";',
			options: [{checkGlobalVariables: true}],
		},
		{
			code: unresolvedValueWithTypeOnlyShadow,
			options: [{checkGlobalVariables: true}],
		},
	],
});

test.snapshot({
	valid: [
		'typeof a.b',
		'typeof a.b > "undefined"',
		'a.b === "undefined"',
		'void a.b === "undefined"',
		'+a.b === "undefined"',
		'++a.b === "undefined"',
		'a.b++ === "undefined"',
		'foo === undefined',
		'typeof a.b === "string"',
		'typeof foo === "undefined"',
		'foo = 2; typeof foo === "undefined"',
		'/* globals foo: readonly */ typeof foo === "undefined"',
		'/* globals globalThis: readonly */ typeof globalThis === "undefined"',
		outdent`
			function parse() {
				switch (typeof value === 'undefined') {}
			}
		`,
		outdent`
			/* globals value: readonly */
			function parse() {
				switch (typeof value === 'undefined') {}
			}
		`,
		// Cases we are not checking
		'"undefined" === typeof a.b',
		'const UNDEFINED = "undefined"; typeof a.b === UNDEFINED',
	],
	invalid: [
		'typeof a.b === "undefined"',
		'typeof a.b !== "undefined"',
		'typeof a.b == "undefined"',
		'typeof a.b != "undefined"',
		'typeof a.b == \'undefined\'',
		'let foo; typeof foo === "undefined"',
		'const foo = 1; typeof foo === "undefined"',
		'var foo; typeof foo === "undefined"',
		'var foo; var foo; typeof foo === "undefined"',
		'for (const foo of bar) typeof foo === "undefined";',
		outdent`
			let foo;
			function bar() {
				typeof foo === "undefined";
			}
		`,
		'function foo() {typeof foo === "undefined"}',
		'function foo(bar) {typeof bar === "undefined"}',
		'function foo({bar}) {typeof bar === "undefined"}',
		'function foo([bar]) {typeof bar === "undefined"}',
		'typeof foo.bar === "undefined"',
		outdent`
			import foo from 'foo';
			typeof foo.bar === "undefined"
		`,
		// ASI
		outdent`
			foo
			typeof [] === "undefined";
		`,
		outdent`
			foo
			typeof (a ? b : c) === "undefined";
		`,
		outdent`
			function a() {
				return typeof // comment
					a.b === 'undefined';
			}
		`,
		outdent`
			function a() {
				return (typeof // ReturnStatement argument is parenthesized
					a.b === 'undefined');
			}
		`,
		outdent`
			function a() {
				return (typeof // UnaryExpression is parenthesized
					a.b) === 'undefined';
			}
		`,
		outdent`
			function parse(value) {
				switch (typeof value === 'undefined') {}
			}
		`,
	],
});

// `checkGlobalVariables: true`
test.snapshot({
	valid: [
	],
	invalid: [
		'typeof undefinedVariableIdentifier === "undefined"',
		'typeof Array !== "undefined"',
		outdent`
			function parse() {
				switch (typeof value === 'undefined') {}
			}
		`,
		outdent`
			/* globals value: readonly */
			function parse() {
				switch (typeof value === 'undefined') {}
			}
		`,
	].map(code => ({code, options: [{checkGlobalVariables: true}]})),
});

test({
	valid: [],
	invalid: [
		{code: 'typeof {value: undefined}.value === "undefined";', output: '({value: undefined}.value) === undefined;', errors: 1},
		{code: 'typeof function () {} === "undefined";', output: '(function () {}) === undefined;', errors: 1},
		{code: 'setup()\ntypeof {value: undefined}.value === "undefined";', output: 'setup()\n;({value: undefined}.value) === undefined;', errors: 1},
		{code: 'const value = typeof {value: undefined}.value === "undefined";', output: 'const value = {value: undefined}.value === undefined;', errors: 1},
		{code: 'const read = () => typeof {value: undefined}.value === "undefined";', output: 'const read = () => ({value: undefined}.value) === undefined;', errors: 1},
		{code: 'export default typeof function () {} === "undefined";', output: 'export default (function () {}) === undefined;', errors: 1},
		{code: '(typeof {value: undefined}.value) === "undefined";', output: '({value: undefined}.value) === undefined;', errors: 1},
		{code: 'typeof ({value: undefined}.value) === "undefined";', output: '({value: undefined}.value) === undefined;', errors: 1},
		{code: 'typeof /* keep */{value: undefined}.value === "undefined";', output: '/* keep */({value: undefined}.value) === undefined;', errors: 1},
	],
});

test.svelte({
	valid: [],
	invalid: [{
		code: '{typeof /x/.source === "undefined"}',
		output: '{(/x/.source) === undefined}',
		errors: 1,
	}],
});
