import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

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
		// Cases we are not checking
		'"undefined" === typeof a.b',
		'const UNDEFINED = "undefined"; typeof a.b === UNDEFINED',
		'typeof a.b === `undefined`',
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
	],
});

// `checkGlobalVariables: true`
test.snapshot({
	valid: [
	],
	invalid: [
		'typeof undefinedVariableIdentifier === "undefined"',
		'typeof Array !== "undefined"',
	].map(code => ({code, options: [{checkGlobalVariables: true}]})),
});
