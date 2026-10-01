import {outdent} from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';
import tests from './shared/simple-array-search-rule-tests.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		...[
			// `indexOf()` never returns less than `-1`
			'str.indexOf(\'foo\') < -1',
			'str.indexOf(\'foo\') <= -2',
			'str.indexOf(\'foo\') !== -n',
			'str.indexOf(\'foo\') !== 1',
			'str.indexOf(\'foo\') === -2',
			'!str.indexOf(\'foo\') === 1',
			'!str.indexOf(\'foo\') === -n',
			'null.indexOf(\'foo\') !== 1',
			'something.indexOf(foo, 0, another) !== -1',
			'_.indexOf(foo, bar) !== -1',
			'lodash.indexOf(foo, bar) !== -1',
			'underscore.indexOf(foo, bar) !== -1',
		].flatMap(code => [code, code.replace('.indexOf', '.lastIndexOf'), {code: `<template><div v-if="${code}"></div></template>`, languageOptions: {parser: parsers.vue}}]),
		// `lastIndexOf` searches backward from `fromIndex`, so it is not equivalent to `.includes()` (forward)
		'foo.lastIndexOf(bar, 0) !== -1',
		'foo.lastIndexOf(bar, 1) !== -1',
		'str.includes(\'foo\')',
		'\'foobar\'.includes(\'foo\')',
		'[1,2,3].includes(4)',
		'f(0) < 0',
		// `indexOf()` compares with `===` and never finds `NaN`, while `.includes()` uses SameValueZero
		'array.indexOf(NaN) !== -1',
		'array.indexOf(NaN) === -1',
		'array.lastIndexOf(NaN) !== -1',
		'str.indexOf(NaN) < 0',
	],
	invalid: [
		...[
			'\'foobar\'.indexOf(\'foo\') !== -1',
			'str.indexOf(\'foo\') != -1',
			'str.indexOf(\'foo\') > -1',
			// `indexOf()` only returns `-1` or a non-negative index, so `<= -1` is `=== -1`
			'str.indexOf(\'foo\') <= -1',
			'str.indexOf(\'foo\') == -1',
			'\'foobar\'.indexOf(\'foo\') >= 0',
			'[1,2,3].indexOf(4) !== -1',
			'str.indexOf(\'foo\') < 0',
			'\'\'.indexOf(\'foo\') < 0',
			'(a || b).indexOf(\'foo\') === -1',
		].flatMap(code => [code, code.replace('.indexOf', '.lastIndexOf'), {code: `<template><div v-if="${code}"></div></template>`, languageOptions: {parser: parsers.vue}}]),
		// `indexOf` with `fromIndex` maps cleanly to `.includes()` (both search forward); `lastIndexOf` does not
		'foo.indexOf(bar, 0) !== -1',
		'foo.indexOf(bar, 1) !== -1',
		{
			code: outdent`
				<script setup lang="ts">
				console.log([].indexOf(1) != -1);
				</script>
			`,
			languageOptions: {parser: parsers.vue},
		},
	],
});

const {snapshot, typescript} = tests({
	method: 'some',
	replacement: 'includes',
});

test.snapshot(snapshot);
test.typescript(typescript);

test({
	valid: [
		'const array = [true, false, true]; array.some(value => value);',
		'const array = [true, false, true]; array.some(value => Boolean(value));',
		typeAware('const array: number[] = [1, 2, 3]; array.some(value => value);'),
		typeAware('const array: number[] = [1, 2, 3]; array.some(value => Boolean(value));'),
		typeAware('const array: unknown[] = [true, false, true]; array.some(value => value);'),
		typeAware('const array: unknown[] = [true, false, true]; array.some(value => Boolean(value));'),
		typeAware('const array: Boolean[] = [true, false, true]; array.some(value => value);'),
		typeAware('const array: Array<boolean | undefined> = [true, false, undefined]; array.some(value => value);'),
		typeAware('const array: Array<boolean | undefined> = [true, false, undefined]; array.some(value => Boolean(value));'),
		typeAware('const array: false[] = [false]; array.some(value => value);'),
		typeAware('const array: false[] = [false]; array.some(value => Boolean(value));'),
		typeAware('declare const array: false[] | boolean[]; array.some(value => value);'),
		typeAware('declare const array: false[] | boolean[]; array.some(value => Boolean(value));'),
		typeAware('declare const array: true[] | false[]; array.some(value => value);'),
		typeAware('declare const array: true[] | false[]; array.some(value => Boolean(value));'),
		typeAware('const collection: {some(callback: (value: boolean) => boolean): boolean} = {} as never; collection.some(value => value);'),
		typeAware('const collection: {some(callback: (value: boolean) => boolean): boolean} = {} as never; collection.some(value => Boolean(value));'),
		typeAware('export {}; type Array<T> = {some(callback: (value: T) => boolean): boolean}; declare const collection: Array<boolean>; collection.some(value => value);'),
		typeAware('export {}; type Array<T> = {some(callback: (value: T) => boolean): boolean}; declare const collection: Array<boolean>; collection.some(value => Boolean(value));'),
	],
	invalid: [
		{
			...typeAware('const array: boolean[] = [true, false, true]; array.some(value => value);'),
			output: 'const array: boolean[] = [true, false, true]; array.includes(true);',
			errors: 1,
		},
		// A comment inside the callback is preserved by not fixing
		{
			code: 'foo.some(bar => /* keep */ bar === baz)',
			errors: 1,
		},
		{
			code: 'foo.some(bar => bar /* keep */ === baz)',
			errors: 1,
		},
		{
			code: 'foo.some(bar => bar === /* keep */ baz)',
			errors: 1,
		},
		{
			code: 'foo.some(bar => { /* keep */ return bar === baz; })',
			errors: 1,
		},
		// A comment in the call is preserved by not fixing
		{
			code: 'foo.indexOf(/* keep */ x) !== -1',
			errors: 1,
		},
		{
			code: 'foo.indexOf(x /* keep */) !== -1',
			errors: 1,
		},
		{
			code: 'foo.indexOf(x, /* keep */ 0) !== -1',
			errors: 1,
		},
		{
			// The comment can also be outside the call
			code: 'foo.indexOf(x) /* keep */ !== -1',
			errors: 1,
		},
		{
			code: 'foo.indexOf(x) !== /* keep */ -1',
			errors: 1,
		},
		{
			code: 'foo.indexOf(x)\n// keep\n!== -1',
			errors: 1,
		},
		{
			...typeAware('const array: boolean[] = [true, false, true]; array.some(value => {return value;});'),
			output: 'const array: boolean[] = [true, false, true]; array.includes(true);',
			errors: 1,
		},
		{
			...typeAware('const array: boolean[] = [true, false, true]; array.some(function (value) {return value;});'),
			output: 'const array: boolean[] = [true, false, true]; array.includes(true);',
			errors: 1,
		},
		{
			...typeAware('const array: boolean[] = [true, false, true]; array.some(value => Boolean(value));'),
			output: 'const array: boolean[] = [true, false, true]; array.includes(true);',
			errors: 1,
		},
		{
			...typeAware('const array: boolean[] = [true, false, true]; array.some(function (value) {return Boolean(value);});'),
			output: 'const array: boolean[] = [true, false, true]; array.includes(true);',
			errors: 1,
		},
		{
			...typeAware('const array: Array<boolean> = [true, false, true]; array.some(value => value);'),
			output: 'const array: Array<boolean> = [true, false, true]; array.includes(true);',
			errors: 1,
		},
		{
			...typeAware('const array: readonly boolean[] = [true, false, true]; array.some(value => value);'),
			output: 'const array: readonly boolean[] = [true, false, true]; array.includes(true);',
			errors: 1,
		},
		{
			...typeAware('const array: true[] = [true]; array.some(value => value);'),
			output: 'const array: true[] = [true]; array.includes(true);',
			errors: 1,
		},
		{
			...typeAware('const array: [true, false] = [true, false]; array.some(value => value);'),
			output: 'const array: [true, false] = [true, false]; array.includes(true);',
			errors: 1,
		},
		{
			...typeAware('const array: boolean[] = [true, false, true]; array.some(value => Boolean(/* keep */ value));'),
			errors: 1,
		},
	],
});

// `some(x => x === NaN)` is always `false`, `includes(NaN)` uses SameValueZero
test({
	valid: [
		'array.indexOf(Number.NaN) !== -1',
		'const notANumber = NaN; array.indexOf(notANumber) !== -1',
		'array.indexOf(Math.sqrt(-1)) !== -1',
		'array.some(element => element === NaN);',
		'array.some(element => NaN === element);',
		'array.some(function (element) { return element === NaN; });',
		'array.some(element => element === Number.NaN);',
		'const notANumber = 0 / 0; array.some(element => element === notANumber);',
	],
	invalid: [
		// A shadowed `NaN` is an ordinary value, so the rewrite still holds
		{
			code: 'function f(NaN) { return array.some(element => element === NaN); }',
			output: 'function f(NaN) { return array.includes(NaN); }',
			errors: 1,
		},
		{
			code: 'function f(NaN) { return array.indexOf(NaN) !== -1; }',
			output: 'function f(NaN) { return array.includes(NaN); }',
			errors: 1,
		},
	],
});

// `indexOf()` only returns `-1` or a non-negative index, so `<= -1` is a non-existence check
test({
	valid: [],
	invalid: [
		{
			code: 'str.lastIndexOf(\'foo\') <= -1',
			output: '!str.includes(\'foo\')',
			errors: 1,
		},
		// No argument searches for `undefined`
		{
			code: 'str.indexOf() !== -1',
			output: 'str.includes()',
			errors: 1,
		},
	],
});
