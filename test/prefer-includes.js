import {getTester, parsers} from './utils/test.js';
import tests from './shared/simple-array-search-rule-tests.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		...[
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
		'str.includes(\'foo\')',
		'\'foobar\'.includes(\'foo\')',
		'[1,2,3].includes(4)',
		'f(0) < 0',
	],
	invalid: [
		'\'foobar\'.indexOf(\'foo\') !== -1',
		'str.indexOf(\'foo\') != -1',
		'str.indexOf(\'foo\') > -1',
		'str.indexOf(\'foo\') == -1',
		'\'foobar\'.indexOf(\'foo\') >= 0',
		'[1,2,3].indexOf(4) !== -1',
		'str.indexOf(\'foo\') < 0',
		'\'\'.indexOf(\'foo\') < 0',
		'(a || b).indexOf(\'foo\') === -1',
		'foo.indexOf(bar, 0) !== -1',
		'foo.indexOf(bar, 1) !== -1',
	].flatMap(code => [code, code.replace('.indexOf', '.lastIndexOf'), {code: `<template><div v-if="${code}"></div></template>`, languageOptions: {parser: parsers.vue}}]),
});

const {snapshot, typescript} = tests({
	method: 'some',
	replacement: 'includes',
});

test.snapshot(snapshot);
test.typescript(typescript);
