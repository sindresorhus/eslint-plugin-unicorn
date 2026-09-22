import outdent from 'outdent';
import {
	getTester,
	avoidTestTitleConflict,
	parsers,
	languages,
} from './utils/test.js';

const {test} = getTester(import.meta);

const MESSAGE_ID = 'number-literal-case';

const error = {
	messageId: MESSAGE_ID,
};

// Legacy octal literals
test({
	testerOptions: {
		languageOptions: {
			parserOptions: {
				sourceType: 'script',
			},
		},
	},
	valid: [
		'var foo = 0777',
		'var foo = 0888',
	],
	invalid: [],
});

const tests = {
	valid: [
		// Number
		'const foo = 1234',
		'const foo = 0b10',
		'const foo = 0o1234567',
		'const foo = 0xABCDEF',

		// BigInt
		'const foo = 1234n',
		'const foo = 0b10n',
		'const foo = 0o1234567n',
		'const foo = 0xABCDEFn',

		// Symbolic value
		'const foo = NaN',
		'const foo = +Infinity',
		'const foo = -Infinity',

		// Exponential notation
		'const foo = 1.2e3',
		'const foo = 1.2e-3',
		'const foo = 1.2e+3',

		// Not number
		'const foo = \'0Xff\'',
		'const foo = \'0Xffn\'',

		// Numeric separator
		'const foo = 123_456',
		'const foo = 0b10_10',
		'const foo = 0o1_234_567',
		'const foo = 0xDEED_BEEF',
		'const foo = 123_456n',
		'const foo = 0b10_10n',
		'const foo = 0o1_234_567n',
		'const foo = 0xDEED_BEEFn',

		// Negative number
		'const foo = -1234',
		'const foo = -0b10',
		'const foo = -0o1234567',
		'const foo = -0xABCDEF',
	],
	invalid: [
		// Number
		{
			code: 'const foo = 0B10',
			output: 'const foo = 0b10',
		},
		{
			code: 'const foo = 0O1234567',
			output: 'const foo = 0o1234567',
		},
		{
			code: 'const foo = 0XaBcDeF',
			output: 'const foo = 0xABCDEF',
		},

		// BigInt
		{
			code: 'const foo = 0B10n',
			output: 'const foo = 0b10n',
		},
		{
			code: 'const foo = 0O1234567n',
			output: 'const foo = 0o1234567n',
		},
		{
			code: 'const foo = 0XaBcDeFn',
			output: 'const foo = 0xABCDEFn',
		},
		// `0n`
		{
			code: 'const foo = 0B0n',
			output: 'const foo = 0b0n',
		},
		{
			code: 'const foo = 0O0n',
			output: 'const foo = 0o0n',
		},
		{
			code: 'const foo = 0X0n',
			output: 'const foo = 0x0n',
		},

		// Exponential notation
		{
			code: 'const foo = 1.2E3',
			output: 'const foo = 1.2e3',
		},
		{
			// Integer mantissa (no decimal point) with exponent
			code: 'const foo = 5E3',
			output: 'const foo = 5e3',
		},
		{
			code: 'const foo = 5E+3',
			output: 'const foo = 5e+3',
		},
		{
			code: 'const foo = 1.2E-3',
			output: 'const foo = 1.2e-3',
		},
		{
			code: 'const foo = 1.2E+3',
			output: 'const foo = 1.2e+3',
		},
		{
			code: outdent`
				const foo = 255;

				if (foo === 0xff) {
					console.log('invalid');
				}
			`,
			output: outdent`
				const foo = 255;

				if (foo === 0xFF) {
					console.log('invalid');
				}
			`,
		},

		// Numeric separator
		{
			code: 'const foo = 0XdeEd_Beefn',
			output: 'const foo = 0xDEED_BEEFn',
		},

		// Negative number
		{
			code: 'const foo = -0B10',
			output: 'const foo = -0b10',
		},
		{
			code: 'const foo = -0O1234567',
			output: 'const foo = -0o1234567',
		},
		{
			code: 'const foo = -0XaBcDeF',
			output: 'const foo = -0xABCDEF',
		},
		{
			// Negative BigInt hex with uppercase prefix
			code: 'const foo = -0XaBcn',
			output: 'const foo = -0xABCn',
		},

		// Lowercase hexadecimal number value
		...[
			{
				code: 'const foo = 0XaBcDeF',
				output: 'const foo = 0xabcdef',
			},
			{
				code: 'const foo = 0xaBcDeF',
				output: 'const foo = 0xabcdef',
			},
			{
				code: 'const foo = 0XaBcDeFn',
				output: 'const foo = 0xabcdefn',
			},
			{
				code: 'const foo = 0XdeEd_Beefn',
				output: 'const foo = 0xdeed_beefn',
			},
		].map(item => ({...item, options: [{hexadecimalValue: 'lowercase'}]})),
	].map(item => ({...item, errors: [error]})),
};

test(tests);

test.snapshot({
	valid: [
		'value = 0xABCDEF',
		'value = 0o755',
		'value = 0b1010',
		'value = -1.2e+3',
		'value = +1_000',
		'value = [inf, +inf, -inf, nan, +nan, -nan]',
		'value = "0xff 1E3"',
		'value = \'0xff 1E3\'',
		'value = 1979-05-27T07:32:00Z',
		'value = { date = 1979-05-27, time = 07:32:00 }',
		'# value = 0xff\nvalue = true',
		{code: 'value = 0xabcdef', options: [{hexadecimalValue: 'lowercase'}]},
	].map(code => ({...(typeof code === 'string' ? {code} : code), filename: 'example.toml', language: languages.toml})),
	invalid: [
		'value = 0xaBcDeF',
		'value = 0x7fff_ffff_ffff_ffff',
		'value = 1E6',
		'value = -1.2E-3',
		'value = +1.2E+3',
		'value = [0xff, { number = 1E3 }] # Keep comment',
		{code: 'value = 0xAB_CD', options: [{hexadecimalValue: 'lowercase'}]},
	].map(code => ({...(typeof code === 'string' ? {code} : code), filename: 'example.toml', language: languages.toml})),
});

test.snapshot({
	testerOptions: {
		languageOptions: {parser: parsers.vue},
	},
	valid: [
		'<template><input value="0XdeEd_Beef"></div></template>',
		'<template><div v-if="0xDEED_BEEF > 0"></div></template>',
	],
	invalid: [
		'<template><div v-if="0XdeEd_Beef > 0"></div></template>',
		'<template><div v-if="0XdeEd_Beefn > 0n"></div></template>',
		'<template><div>{{1.2E3}}</div></template>',
		'<template><div>{{0B1n}}</div></template>',
		'<script>export default {data() {return {n: 0XdeEd_Beefn}}}</script>',
	],
});

test.snapshot({
	valid: [languages.json, languages.jsonc, languages.json5].flatMap(language => ['[1.2e3, -1.2e-3, "1E3"]'].map(code => ({code, language}))),
	invalid: [languages.json, languages.jsonc, languages.json5].flatMap(language => ['[1E3, -1.2E-3, 1E999]'].map(code => ({code, language}))),
});

test.snapshot({
	valid: ['[0xABCD, -0xABCD, Infinity, -Infinity, NaN]'].map(code => ({code, language: languages.json5})),
	invalid: [
		{code: '[0Xabcd, -0Xabcd, +0Xabcd]'},
		{code: '[0XABCD, -0XABCD]', options: [{hexadecimalValue: 'lowercase'}]},
	].map(testCase => ({...testCase, language: languages.json5})),
});

test.snapshot({
	valid: [
		'a { width: 1e3PX; height: 1EM; content: "1E3"; background: url(1E3.png) }',
		'/* 1E3 */ .item1E3 { --number: 1e3; }',
		'@font-face { unicode-range: U+1E3, U+1E3-1E4; }',
	].map(code => ({code, language: languages.css})),
	invalid: [
		'a { width: 1E3PX; opacity: +1E-1; height: 1E2%; }',
		String.raw`a { --number: -1.2E+3; --size: 1E3\70x; }`,
		'@media (width > 1E3px) { a { width: calc(1E2px + 1px) } }',
	].map(code => ({code, language: languages.css})),
});

test.snapshot({
	valid: [
		'value: [0xAF, 1e3, .inf, -.Inf, .INF, .NaN, "1E3", true]',
		'value: !!str 1E3',
		'value: |\n  1E3\n',
	].map(code => ({code, language: languages.yaml})),
	invalid: [
		'value: [0xaf, 1E3, -1.2E+3] # preserve',
		'value: &number 1E3',
		{code: 'value: 0xABCD', options: [{hexadecimalValue: 'lowercase'}]},
	].map(testCase => ({language: languages.yaml, ...(typeof testCase === 'string' ? {code: testCase} : testCase)})),
});
