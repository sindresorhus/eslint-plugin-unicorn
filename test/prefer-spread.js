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
		'Int8Array.from(set);',
		'Uint8Array.from(set);',
		'Uint8ClampedArray.from(set);',
		'Int16Array.from(set);',
		'Uint16Array.from(set);',
		'Int32Array.from(set);',
		'Uint32Array.from(set);',
		'Float32Array.from(set);',
		'Float64Array.from(set);'
	],
	invalid: [
		{
			code: 'const x = Array.from(set);',
			errors: [{message: 'Prefer the spread operator over `Array.from()`.', column: 11, line: 1}],
			output: 'const x = [...set];'
		},
		{
			code: 'Array.from(set).map(() => {});',
			errors: [{message: 'Prefer the spread operator over `Array.from()`.', column: 1, line: 1}],
			output: '[...set].map(() => {});'
		},
		{
			code: 'Array.from(set, mapFn).reduce(() => {});',
			errors: [{message: 'Prefer the spread operator over `Array.from()`.', column: 1, line: 1}],
			output: '[...set].map(mapFn).reduce(() => {});'
		},
		{
			code: 'Array.from(set, mapFn, thisArg).reduce(() => {});',
			errors: [{message: 'Prefer the spread operator over `Array.from()`.', column: 1, line: 1}],
			output: '[...set].map(mapFn, thisArg).reduce(() => {});'
		},
		{
			code: 'Array.from(set, () => {}, thisArg).reduce(() => {});',
			errors: [{message: 'Prefer the spread operator over `Array.from()`.', column: 1, line: 1}],
			output: '[...set].map(() => {}, thisArg).reduce(() => {});'
		},
		{
			code: 'Array.from(new Set([1, 2])).map(() => {});',
			errors: [{message: 'Prefer the spread operator over `Array.from()`.', column: 1, line: 1}],
			output: '[...new Set([1, 2])].map(() => {});'
		},
		{
			code: 'Array.from(document.querySelectorAll("*")).map(() => {});',
			errors: [{message: 'Prefer the spread operator over `Array.from()`.', column: 1, line: 1}],
			output: '[...document.querySelectorAll("*")].map(() => {});'
		}
	]
});
