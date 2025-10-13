import outdent from 'outdent';
import {getTester, avoidTestTitleConflict, parsers} from './utils/test.js';

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
test.babel(avoidTestTitleConflict(tests, 'babel'));
test.typescript(avoidTestTitleConflict(tests, 'typescript'));

test.snapshot({
	valid: [],
	invalid: [
		'console.log(BigInt(0B10 + 1.2E+3) + 0XdeEd_Beefn)',
	],
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
