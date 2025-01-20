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
			var foo = 10;
			var bar = '20';

			var value = foo > bar ? bar : foo;
		`,
		outdent`
			var foo = 10;
			var bar: string;

			var value = foo > bar ? bar : foo;
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
	],
});
