import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const error = {
	messageId: 'numeric-separators-style',
};

const legacyOctalLanguageOptions = {ecmaVersion: 6, sourceType: 'script'};

// Most of these test cases copied from:
// https://github.com/eslint/eslint/blob/master/tests/lib/rules/camelcase.js
test({
	valid: [
		// Hexadecimal
		'const foo = 0xAB_CD',
		'const foo = 0xAB',
		'const foo = 0xA',
		'const foo = 0xA_BC_DE_F0',
		'const foo = 0xab_e8_12',
		'const foo = 0xe',
		'const foo = 0Xab_e3_cd',

		// Octal
		'const foo = 0o1234_5670',
		'const foo = 0o7777',
		'const foo = 0o01',
		'const foo = 0o12_7000_0000',
		'const foo = 0O1111_1111',

		// Legacy octal
		...[
			'const foo = 0777777',
			'var foo = 0999999',
			'let foo = 0111222',
		].map(code => ({code, languageOptions: legacyOctalLanguageOptions})),

		// Binary
		'const foo = 0b1010_0001_1000_0101',
		'const foo = 0b0000',
		'const foo = 0b10',
		'const foo = 0b1_0111_0101_0101',
		'const foo = 0B1010',

		// Binary with BigInt
		'const foo = 0b1010n',
		'const foo = 0b1010_1010n',

		// BigInt
		'const foo = 9_223_372_036_854_775_807n',
		'const foo = 807n',
		'const foo = 1n',
		'const foo = 9_372_854_807n',
		'const foo = 9807n',
		'const foo = 0n',

		// Numbers
		'const foo = 12_345_678',
		'const foo = 123',
		'const foo = 1',
		'const foo = 1234',
		{
			code: 'const foo = 1_234',
			options: [{number: {minimumDigits: 0, groupLength: 3}}],
		},

		// Decimal numbers
		'const foo = 9807.123',
		'const foo = 3819.123_432',
		'const foo = 138_789.123_432_42',
		'const foo = .000_000_1',

		// Negative numbers
		'const foo = -3000',
		'const foo = -10_000_000',

		// Exponential notation
		'const foo = 1e10_000',
		'const foo = 39_804e1000',
		'const foo = -123_456e-100',
		'const foo = -100_000e-100_000',
		'const foo = -100_000e+100_000',
		'const foo = 3.6e12_000',
		'const foo = 3.6E12_000',
		'const foo = -1_200_000e5',

		// Miscellaneous values
		'const foo = -282_932 - (1938 / 10_000) * .1 + 18.100_000_2',
		'const foo = NaN',
		'const foo = Infinity',
		'const foo = "1234567n"',

		// Varying options
		{
			code: 'const foo = 10000',
			options: [{number: {minimumDigits: 6}}],
		},
		{
			code: 'const foo = 100_0000_0000',
			options: [{number: {groupLength: 4}}],
		},
		{
			code: 'const foo = 0xA_B_C_D_E_1_2_3_4',
			options: [{hexadecimal: {groupLength: 1}}],
		},
		{
			code: 'const foo = 0b111',
			options: [{number: {minimumDigits: 3, groupLength: 1}}],
		},
		{
			code: outdent`
				const binary = 0b10101010;
				const octal = 0o76543210;
				const hexadecimal = 0xfedcba97;
				const number = 12345678.12345678e12345678;
			`,
			options: [{
				onlyIfContainsSeparator: true,
			}],
		},
		{
			code: outdent`
				const binary = 0b1010_1010;
				const octal = 0o76543210;
				const hexadecimal = 0xfedcba97;
				const number = 12345678.12345678e12345678;
			`,
			options: [{
				onlyIfContainsSeparator: true,
				binary: {
					onlyIfContainsSeparator: false,
				},
			}],
		},
		{
			code: outdent`
				const binary = 0b10_10_10_10;
				const octal = 0o76543210;
				const hexadecimal = 0xfedcba97;
				const number = 12345678.12345678e12345678;
			`,
			options: [{
				onlyIfContainsSeparator: true,
				binary: {
					onlyIfContainsSeparator: false,
					groupLength: 2,
				},
			}],
		},
		{
			code: outdent`
				const binary = 0b10101010;
				const octal = 0o7654_3210;
				const hexadecimal = 0xfe_dc_ba_97;
				const number = 12_345_678.123_456_78e12_345_678;
			`,
			options: [{
				binary: {
					onlyIfContainsSeparator: true,
				},
			}],
		},
		{
			code: 'const foo = 12345',
			options: [{number: {onlyIfContainsSeparator: true}}],
		},
		{
			code: 'const foo = 12345678',
			options: [{number: {onlyIfContainsSeparator: true}}],
		},
		{
			code: 'const foo = 12_345',
			options: [{number: {onlyIfContainsSeparator: true}}],
		},
		{
			code: 'const foo = 1789.123_432_42',
			options: [{number: {onlyIfContainsSeparator: true}}],
		},
		{
			code: 'const foo = -100_000e+100_000',
			options: [{number: {onlyIfContainsSeparator: true}}],
		},
		{
			code: 'const foo = -100000e+100000',
			options: [{number: {onlyIfContainsSeparator: true}}],
		},
		{
			code: 'const foo = -282_932 - (1938 / 10_000) * .1 + 18.100_000_2',
			options: [{number: {onlyIfContainsSeparator: true}}],
		},
		{
			code: 'const foo = 0xA_B_C_D_E',
			options: [{hexadecimal: {onlyIfContainsSeparator: true, groupLength: 1}}],
		},
		{
			code: 'const foo = 0o7777',
			options: [{octal: {onlyIfContainsSeparator: true, minimumDigits: 4}}],
		},
		{
			code: 'const foo = 0xABCDEF012',
			options: [{hexadecimal: {onlyIfContainsSeparator: true}}],
		},
		{
			code: 'const foo = 0o777777',
			options: [{octal: {onlyIfContainsSeparator: true, minimumDigits: 3}}],
		},
		{
			code: 'const foo = 0o777777',
			options: [{octal: {onlyIfContainsSeparator: true, minimumDigits: 3, groupLength: 2}}],
		},
		{
			code: 'const foo = 0o777_777',
			options: [{octal: {onlyIfContainsSeparator: true, minimumDigits: 2, groupLength: 3}}],
		},
		{
			code: 'const foo = 0b01010101',
			options: [{onlyIfContainsSeparator: true, binary: {onlyIfContainsSeparator: true}}],
		},
		{
			code: 'const foo = 0b0101_0101',
			options: [{onlyIfContainsSeparator: false, binary: {onlyIfContainsSeparator: true}}],
		},
		{
			code: 'const foo = 0b0101_0101',
			options: [{onlyIfContainsSeparator: false, binary: {onlyIfContainsSeparator: false}}],
		},
	],
	invalid: [
		// Hexadecimal
		{
			code: 'const foo = 0xA_B_CDE_F0',
			errors: [error],
			output: 'const foo = 0xA_BC_DE_F0',
		},
		{
			code: 'const foo = 0xABCDEF',
			errors: [error],
			output: 'const foo = 0xAB_CD_EF',
		},
		{
			code: 'const foo = 0xA_B',
			errors: [error],
			output: 'const foo = 0xAB',
		},
		{
			code: 'const foo = 0XAB_C_D',
			errors: [error],
			output: 'const foo = 0XAB_CD',
		},

		// Octal
		{
			code: 'const foo = 0o12_34_5670',
			errors: [error],
			output: 'const foo = 0o1234_5670',
		},
		{
			code: 'const foo = 0o7_7_77',
			errors: [error],
			output: 'const foo = 0o7777',
		},
		{
			code: 'const foo = 0o010101010101',
			errors: [error],
			output: 'const foo = 0o0101_0101_0101',
		},
		{
			code: 'const foo = 0O010101010101',
			errors: [error],
			output: 'const foo = 0O0101_0101_0101',
		},

		// Binary
		{
			code: 'const foo = 0b10_10_0001',
			errors: [error],
			output: 'const foo = 0b1010_0001',
		},
		{
			code: 'const foo = 0b0_00_0',
			errors: [error],
			output: 'const foo = 0b0000',
		},
		{
			code: 'const foo = 0b10101010101010',
			errors: [error],
			output: 'const foo = 0b10_1010_1010_1010',
		},
		{
			code: 'const foo = 0B10101010101010',
			errors: [error],
			output: 'const foo = 0B10_1010_1010_1010',
		},

		// BigInt
		{
			code: 'const foo = 1_9_223n',
			errors: [error],
			output: 'const foo = 19_223n',
		},
		{
			code: 'const foo = 80_7n',
			errors: [error],
			output: 'const foo = 807n',
		},
		{
			code: 'const foo = 123456789_100n',
			errors: [error],
			output: 'const foo = 123_456_789_100n',
		},

		// Numbers
		{
			code: 'const foo = 1_2_345_678',
			errors: [error],
			output: 'const foo = 12_345_678',
		},
		{
			code: 'const foo = 12_3',
			errors: [error],
			output: 'const foo = 123',
		},
		{
			code: 'const foo = 1234567890',
			errors: [error],
			output: 'const foo = 1_234_567_890',
		},

		// Decimal numbers
		{
			code: 'const foo = 9807.1234567',
			errors: [error],
			output: 'const foo = 9807.123_456_7',
		},
		{
			code: 'const foo = 3819.123_4325',
			errors: [error],
			output: 'const foo = 3819.123_432_5',
		},
		{
			code: 'const foo = 138789.12343_2_42',
			errors: [error],
			output: 'const foo = 138_789.123_432_42',
		},
		{
			code: 'const foo = .000000_1',
			errors: [error],
			output: 'const foo = .000_000_1',
		},
		{
			code: 'const foo = 12345678..toString()',
			errors: [error],
			output: 'const foo = 12_345_678..toString()',
		},
		{
			code: 'const foo = 12345678 .toString()',
			errors: [error],
			output: 'const foo = 12_345_678 .toString()',
		},
		{
			code: 'const foo = .00000',
			errors: [error],
			output: 'const foo = .000_00',
		},
		{
			code: 'const foo = 0.00000',
			errors: [error],
			output: 'const foo = 0.000_00',
		},

		// Negative numbers
		{
			code: 'const foo = -100000_1',
			errors: [error],
			output: 'const foo = -1_000_001',
		},

		// Exponential notation
		{
			code: 'const foo = 1e10000',
			errors: [error],
			output: 'const foo = 1e10_000',
		},
		{
			code: 'const foo = 39804e10000',
			errors: [error],
			output: 'const foo = 39_804e10_000',
		},
		{
			code: 'const foo = -123456e100',
			errors: [error],
			output: 'const foo = -123_456e100',
		},
		{
			code: 'const foo = -100000e-10000',
			errors: [error],
			output: 'const foo = -100_000e-10_000',
		},
		{
			code: 'const foo = -1000e+10000',
			errors: [error],
			output: 'const foo = -1000e+10_000',
		},
		{
			code: 'const foo = -1000e+00010000',
			errors: [error],
			output: 'const foo = -1000e+00_010_000',
		},
		{
			code: 'const foo = 3.6e12000',
			errors: [error],
			output: 'const foo = 3.6e12_000',
		},
		{
			code: 'const foo = -1200000e5',
			errors: [error],
			output: 'const foo = -1_200_000e5',
		},
		{
			code: 'const foo = 3.65432E12000',
			errors: [error],
			output: 'const foo = 3.654_32E12_000',
		},

		// Varying options
		{
			code: 'const foo = 1000000',
			options: [{number: {minimumDigits: 6}}],
			errors: [error],
			output: 'const foo = 1_000_000',
		},
		{
			code: 'const foo = 10_000_000_000',
			options: [{number: {groupLength: 4}}],
			errors: [error],
			output: 'const foo = 100_0000_0000',
		},
		{
			code: 'const foo = 0xA_B_CD',
			options: [{hexadecimal: {groupLength: 1}}],
			errors: [error],
			output: 'const foo = 0xA_B_C_D',
		},
		{
			code: 'const foo = 0b1_11',
			options: [{number: {minimumDigits: 3, groupLength: 2}}],
			errors: [error],
			output: 'const foo = 0b111',
		},
		{
			code: 'const foo = -100000e+100000',
			options: [{number: {onlyIfContainsSeparator: false}}],
			errors: [error],
			output: 'const foo = -100_000e+100_000',
		},
		{
			code: outdent`
				const binary = 0b10_101010;
				const octal = 0o76_543210;
				const hexadecimal = 0xfe_dcba97;
				const number = 12_345678.12345678e12345678;
			`,
			output: outdent`
				const binary = 0b1010_1010;
				const octal = 0o7654_3210;
				const hexadecimal = 0xfe_dc_ba_97;
				const number = 12_345_678.123_456_78e12_345_678;
			`,
			options: [{
				onlyIfContainsSeparator: true,
			}],
			errors: 4,
		},
		{
			code: outdent`
				const binary = 0b10101010;
				const octal = 0o76_543210;
				const hexadecimal = 0xfe_dcba97;
				const number = 12_345678.12345678e12345678;
			`,
			output: outdent`
				const binary = 0b1010_1010;
				const octal = 0o7654_3210;
				const hexadecimal = 0xfe_dc_ba_97;
				const number = 12_345_678.123_456_78e12_345_678;
			`,
			options: [{
				onlyIfContainsSeparator: true,
				binary: {
					onlyIfContainsSeparator: false,
				},
			}],
			errors: 4,
		},
		{
			code: outdent`
				const binary = 0b10101010;
				const octal = 0o76_543210;
				const hexadecimal = 0xfe_dcba97;
				const number = 12_345678.12345678e12345678;
			`,
			output: outdent`
				const binary = 0b10_10_10_10;
				const octal = 0o7654_3210;
				const hexadecimal = 0xfe_dc_ba_97;
				const number = 12_345_678.123_456_78e12_345_678;
			`,
			options: [{
				onlyIfContainsSeparator: true,
				binary: {
					onlyIfContainsSeparator: false,
					groupLength: 2,
				},
			}],
			errors: 4,
		},
		{
			code: outdent`
				const binary = 0b10_101010;
				const octal = 0o76543210;
				const hexadecimal = 0xfedcba97;
				const number = 12345678.12345678e12345678;
			`,
			output: outdent`
				const binary = 0b1010_1010;
				const octal = 0o7654_3210;
				const hexadecimal = 0xfe_dc_ba_97;
				const number = 12_345_678.123_456_78e12_345_678;
			`,
			options: [{
				binary: {
					onlyIfContainsSeparator: true,
				},
			}],
			errors: 4,
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		'console.log(0XdeEdBeeFn)',
		'const foo = 12345678..toString()',
	],
});
