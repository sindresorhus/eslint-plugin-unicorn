import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const array = Array.from({length: 1})',

		// ESLint builtin rule `no-array-constructor` cases
		'const array = new Array()',
		'const array = new Array',
		'const array = new Array(1, 2)',
		'const array = Array(1, 2)',

		// `unicorn/new-for-builtins` cases
		'const array = Array(1)',
	],
	invalid: [
		'const array = new Array(1)',
		// This is actually `[]`, but we fix to `Array.from({length: zero})`
		outdent`
			const zero = 0;
			const array = new Array(zero);
		`,
		// Use shorthand
		outdent`
			const length = 1;
			const array = new Array(length);
		`,
		'const array = new Array(1.5)',
		'const array = new Array(Number("1"))',
		'const array = new Array("1")',
		'const array = new Array(null)',
		'const array = new Array(("1"))',
		'const array = new Array((0, 1))',
		outdent`
			const foo = []
			new Array("bar").forEach(baz)
		`,
		// Number
		'new Array(0xff)',
		'new Array(Math.PI | foo)',
		'new Array(Math.min(foo, bar))',
		'new Array(Number(foo))',
		'new Array(Number.MAX_SAFE_INTEGER)',
		'new Array(parseInt(foo))',
		'new Array(Number.parseInt(foo))',
		'new Array(+foo)',
		'new Array(-Math.PI)',
		'new Array(-"-2")',
		'new Array(foo.length)',
		'const foo = 1; new Array(foo + 2)',
		'new Array(foo - 2)',
		'new Array(foo -= 2)',
		'new Array(foo ? 1 : 2)',
		'const truthy = "truthy"; new Array(truthy ? 1 : foo)',
		'const falsy = !"truthy"; new Array(falsy ? foo : 1)',
		'new Array((1n, 2))',
		'new Array(Number.NaN)',
		'new Array(NaN)',
		'new Array(foo >>> bar)',
		'new Array(foo >>>= bar)',
		'new Array(++bar.length)',
		'new Array(bar.length++)',
		'new Array(foo = bar.length)',
		// Not number
		'new Array("0xff")',
		'new Array(Math.NON_EXISTS_PROPERTY)',
		'new Array(Math.NON_EXISTS_METHOD(foo))',
		'new Array(Math[min](foo, bar))',
		'new Array(Number[MAX_SAFE_INTEGER])',
		'new Array(new Number(foo))',
		'const foo = 1; new Array(foo + "2")',
		'new Array(foo - 2n)',
		'new Array(foo -= 2n)',
		'new Array(foo instanceof 1)',
		'new Array(foo || 1)',
		'new Array(foo ||= 1)',
		'new Array(foo ? 1n : 2)',
		'new Array((1, 2n))',
		'new Array(-foo)',
		'new Array(~foo)',
		'new Array(typeof 1)',
		'const truthy = "truthy"; new Array(truthy ? foo : 1)',
		'const falsy = !"truthy"; new Array(falsy ? 1 : foo)',
		'new Array(unknown ? foo : 1)',
		'new Array(unknown ? 1 : foo)',
		'new Array(++foo)',
		'const array = new Array(foo)',
		'const array = new Array(length)',
		outdent`
			const foo = []
			new Array(bar).forEach(baz)
		`,
		...[
			'...[foo]',
			'...foo',
			'...[...foo]',
			// The following cases we can know the result, but we are not auto-fixing them
			'...[1]',
			'...["1"]',
			'...[1, "1"]',
		].map(argumentText => `const array = new Array(${argumentText})`),
		outdent`
			const foo = []
			new Array(...bar).forEach(baz)
		`,
	],
});
