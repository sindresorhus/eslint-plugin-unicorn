import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a === b',
		'a !== b',
		'a > b',
		'!Array.isArray(value)',
		'!(a === b && c === d)',
		'!(a || b)',
		'!(key in object)',
		'!(value instanceof Class)',
		'!foo',
		'!!(a === b)',
		'!foo === bar',
	],
	invalid: [
		'!(a === b)',
		'!(a !== b)',
		'!(a == b)',
		'!(a != b)',
		'!(typeof value === "undefined")',
		'!((a === b))',
		'(!(a === b)).toString()',
		'foo(!(a === b))',
		'!(a /* comment */ === b)',
		'!/* comment */(a === b)',
		outdent`
			foo
			!([a] === b)
		`,
		outdent`
			function foo() {
				return!
					(a === b);
			}
		`,
		outdent`
			function foo() {
				throw!
					(a === b);
			}
		`,
		'function foo() { return!(a === b); }',
		'function foo() { throw!(a === b); }',
		'switch (foo) { case!(a === b): break; }',
		'async function foo() { return await !(a === b); }',
		'async function foo() { return await!(a === b); }',
		'const foo = void !(a === b);',
		'const foo = typeof !(a === b);',
		'const foo = +!(a === b);',
		'const foo = a + !(b === c);',
		'function * foo() { yield !(a === b); }',
		'function * foo() { yield!(a === b); }',
		'foo(...!(a === b));',
		'async function foo() { return await !(a > b); }',
		'const foo = a + !(b > c);',
		'!(a > b)',
		'!(a >= b)',
		'!(a < b)',
		'!(a <= b)',
		'!(null > undefined)',
		{
			code: '!(foo! === bar)',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: '!((foo as string) === bar)',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const foo = !(a === b) as boolean;',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const foo = !(a === b) satisfies boolean;',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const foo = <boolean>!(a === b);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const foo = (!(a === b))!;',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});

test.snapshot({
	valid: [
		{
			code: '!(a && b)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a === b && c)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a === b && foo())',
			options: [{checkLogicalExpressions: true}],
		},
	],
	invalid: [
		{
			code: '!(a === b && c === d)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a !== b || c != d)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a > b && c === d)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a === b || c <= d)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a === b && (c === d || e === f))',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!((a === b && c === d) && e === f)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a === b && c === d || e === f)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a === b || c === d && e === f)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a > b && (c === d || e <= f))',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!((a || b) === c && d === e)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!((a || b) > c && d === e)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!/* comment */(a === b && c === d)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a /* comment */ === b && c === d)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a === b && /* comment */ c === d)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: outdent`
				foo
				!(a === b && c === d)
			`,
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: outdent`
				function foo() {
					return!
						(a === b && c === d);
				}
			`,
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: 'function foo() { return!(a === b && c === d); }',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: 'function foo() { throw!(a === b && c === d); }',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: 'switch (foo) { case!(a === b && c === d): break; }',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: 'async function foo() { return await!(a === b && c === d); }',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: 'function * foo() { yield!(a === b && c === d); }',
			options: [{checkLogicalExpressions: true}],
		},
	],
});
