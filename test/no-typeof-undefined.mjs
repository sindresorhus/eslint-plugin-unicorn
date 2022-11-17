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
		'typeof a.b === "string"',
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
		'typeof undefinedVariableIdentifier == \'undefined\'',
		// ASI
		outdent`
			foo
			typeof [] === "undefined";
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




		// 'let foo; + foo === "undefined"',
		// 'let foo; void foo === "undefined"',
		// 'let foo; typeof foo > "undefined"',
		// 'let foo; typeof foo instanceof "undefined"',
		// 'let foo; typeof foo in "undefined"',
		// Cases we are not checking
		// 'var foo; typeof foo === "undefined"',
		// 'let foo; typeof foo === "undefined"',
		// 'let foo; typeof foo == "undefined"',
		// 'let foo; "undefined" === typeof foo',
		// 'let foo; const UNDEFINED_TYPE = "undefined"; UNDEFINED_TYPE == typeof foo',
		// 'let foo; const UNDEFINED = undefined; typeof UNDEFINED == typeof foo',
		// 'let foo; typeof undefined == typeof foo',
		// 'let foo; `undefined` === typeof foo',
		// 'const foo = 1; typeof foo === "undefined"',
		// outdent`
		// 	let foo;
		// 	function bar() {
		// 		typeof foo === "undefined";
		// 	}
		// `,
		// 'function foo() {typeof foo === "undefined"}',
		// 'function foo(bar) {typeof bar === "undefined"}',
		// 'typeof foo.bar === "undefined"',
		// // ASI
		// outdent`
		// 	foo
		// 	typeof [] === "undefined";
		// `,
