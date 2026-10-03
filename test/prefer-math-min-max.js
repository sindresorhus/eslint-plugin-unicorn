import {outdent} from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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
			errors: 1,
		},
		{
			code: 'const value = height > /* keep */ 50 ? 50 : height;',
			errors: 1,
		},
		{
			code: 'const value = height > 50 /* keep */ ? 50 : height;',
			errors: 1,
		},
		{
			code: 'const value = height > 50 ? 50 /* keep */ : height;',
			errors: 1,
		},
		{
			code: 'const value = height > 50 ? /* keep */ 50 : height;',
			errors: 1,
		},
		{
			code: 'const value = height > 50 ? 50 : height;',
			output: 'const value = Math.min(height, 50);',
			errors: 1,
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
	],
	invalid: [
		outdent`
			function foo(a, b) {
				return (a as number) > b ? a : b;
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
			var foo: number;
			var bar: number;

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
});

// The same operand is written on both sides, so the source evaluates it twice and the rewrite only once
test({
	valid: [],
	invalid: [
		...[
			'const a = f() > 0 ? f() : 0;',
			// The effectful call hides inside a wrapper that evaluates its operands eagerly
			'const a = (x++, y) > 0 ? 0 : (x++, y);',
			'const a = (x = 1, y) > 0 ? 0 : (x = 1, y);',
			'const a = (x || f()) > 0 ? 0 : (x || f());',
			'const a = (x ? f() : g()) > 0 ? 0 : (x ? f() : g());',
			'const a = [f()] > 0 ? 0 : [f()];',
			'const a = ({a: f()}) > 0 ? 0 : ({a: f()});',
		].map(code => ({code, errors: 1})),
		// A wrapper without an effect still evaluates the same way
		{
			code: 'const a = (x, y) > 0 ? 0 : (x, y);',
			output: 'const a = Math.min((x, y), 0);',
			errors: 1,
		},
		// A template literal with an expression can run `toString()`
		{
			// eslint-disable-next-line no-template-curly-in-string
			code: 'const a = `${x}` > 0 ? 0 : `${x}`;',
			errors: 1,
		},
		{
			code: 'const a = `1` > 0 ? 0 : `1`;',
			output: 'const a = Math.min(`1`, 0);',
			errors: 1,
		},
		// A function body does not run where it is written
		{
			code: 'const a = [() => f()] > 0 ? 0 : [() => f()];',
			output: 'const a = Math.min([() => f()], 0);',
			errors: 1,
		},
		// An import binding has no initializer to check
		{
			code: 'import foo from "foo"; const a = foo > 0 ? 0 : foo;',
			output: 'import foo from "foo"; const a = Math.min(foo, 0);',
			errors: 1,
		},
	],
});
