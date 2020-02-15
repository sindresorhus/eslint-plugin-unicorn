import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-spread';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

ruleTester.run('prefer-spread', rule, {
	valid: [
		'[...set].map(() => {});',
		// TypedArray.from
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/from
		'Int8Array.from(set);',
		'Uint8Array.from(set);',
		'Uint8ClampedArray.from(set);',
		'Int16Array.from(set);',
		'Uint16Array.from(set);',
		'Int32Array.from(set);',
		'Uint32Array.from(set);',
		'Float32Array.from(set);',
		'Float64Array.from(set);',
		'BigInt64Array.from(set);',
		'BigUint64Array.from(set);',

		// Not `CallExpression`
		'new Array.from(foo);',
		// Not `MemberExpression`
		'from(foo);',
		// `callee.property` is not a `Identifier`
		'Array["from"](foo);',
		// Computed
		'Array[from](foo);',
		// Not `from`
		'Array.foo(foo);',
		// Not `Array`
		'foo.from(foo);',
		// `callee.object.type` is not a `Identifier`
		'lib.Array.from(foo);',
		// More/Less arguments
		'Array.from();',
		'Array.from(foo, mapFn, thisArg, extra);',
		'Array.from(...argumentsArray);',
		// FirstArgument is `ObjectExpression`
		'Array.from({length: 10});'
	],
	invalid: [
		{
			code: 'const x = Array.from(set);',
			errors: [
				{
					message: 'Prefer the spread operator over `Array.from()`.',
					column: 11,
					line: 1
				}
			],
			output: 'const x = [...set];'
		},
		{
			code: 'Array.from(set).map(() => {});',
			errors: [
				{
					message: 'Prefer the spread operator over `Array.from()`.',
					column: 1,
					line: 1
				}
			],
			output: '[...set].map(() => {});'
		},
		{
			code: 'Array.from(set, mapFn).reduce(() => {});',
			errors: [
				{
					message: 'Prefer the spread operator over `Array.from()`.',
					column: 1,
					line: 1
				}
			],
			output: '[...set].map(mapFn).reduce(() => {});'
		},
		{
			code: 'Array.from(set, mapFn, thisArg).reduce(() => {});',
			errors: [
				{
					message: 'Prefer the spread operator over `Array.from()`.',
					column: 1,
					line: 1
				}
			],
			output: '[...set].map(mapFn, thisArg).reduce(() => {});'
		},
		{
			code: 'Array.from(set, () => {}, thisArg).reduce(() => {});',
			errors: [
				{
					message: 'Prefer the spread operator over `Array.from()`.',
					column: 1,
					line: 1
				}
			],
			output: '[...set].map(() => {}, thisArg).reduce(() => {});'
		},
		{
			code: 'Array.from(new Set([1, 2])).map(() => {});',
			errors: [
				{
					message: 'Prefer the spread operator over `Array.from()`.',
					column: 1,
					line: 1
				}
			],
			output: '[...new Set([1, 2])].map(() => {});'
		},
		{
			code: 'Array.from(document.querySelectorAll("*")).map(() => {});',
			errors: [
				{
					message: 'Prefer the spread operator over `Array.from()`.',
					column: 1,
					line: 1
				}
			],
			output: '[...document.querySelectorAll("*")].map(() => {});'
		}
	]
});
