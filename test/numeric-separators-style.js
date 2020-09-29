import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/numeric-separators-style';
import visualizeRuleTester from './utils/visualize-rule-tester';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2021
	}
});

const error = {
	messageId: 'numeric-separators-style'
};

// Most of these test cases copied from:
// https://github.com/eslint/eslint/blob/master/tests/lib/rules/camelcase.js
ruleTester.run('numeric-separators-style', rule, {
	valid: [
		// Hexadecimal
		'var foo = 0xAB_CD',
		'var foo = 0xAB',
		'var foo = 0xA',
		'var foo = 0xA_BC_DE_F0',
		'var foo = 0xab_e8_12',
		'var foo = 0xe',
		'var foo = 0Xab_e3_cd',

		// Octal
		'var foo = 0o1234_5670',
		'var foo = 0o7777',
		'var foo = 0o01',
		'var foo = 0o12_7000_0000',
		'var foo = 0O1111_1111',

		// Legacy octal
		'var foo = 0777777',
		'var foo = 0999999',
		'var foo = 0111222',

		// Binary
		'var foo = 0b1010_0001_1000_0101',
		'var foo = 0b0000',
		'var foo = 0b10',
		'var foo = 0b1_0111_0101_0101',
		'var foo = 0B1010',

		// Binary with BigInt
		'var foo = 0b1010n',
		'var foo = 0b1010_1010n',

		// BigInt
		'var foo = 9_223_372_036_854_775_807n',
		'var foo = 807n',
		'var foo = 1n',
		'var foo = 9_372_854_807n',
		'var foo = 9807n',
		'var foo = 0n',

		// Numbers
		'var foo = 12_345_678',
		'var foo = 123',
		'var foo = 1',
		'var foo = 1234',
		{
			code: 'var foo = 1_234',
			options: [{number: {minimumDigits: 0, groupLength: 3}}]
		},

		// Decimal numbers
		'var foo = 9807.123',
		'var foo = 3819.123_432',
		'var foo = 138_789.123_432_42',
		'var foo = .000_000_1',

		// Negative numbers
		'var foo = -3000',
		'var foo = -10_000_000',

		// Exponential notation
		'var foo = 1e10_000',
		'var foo = 39_804e1000',
		'var foo = -123_456e-100',
		'var foo = -100_000e-100_000',
		'var foo = -100_000e+100_000',
		'var foo = 3.6e12_000',
		'var foo = 3.6E12_000',
		'var foo = -1_200_000e5',

		// Miscellaneous values
		'var foo = -282_932 - (1938 / 10_000) * .1 + 18.100_000_2',
		'var foo = NaN',
		'var foo = Infinity',
		'var foo = "1234567n"',

		// Varying options
		{
			code: 'var foo = 10000',
			options: [{number: {minimumDigits: 6}}]
		},
		{
			code: 'var foo = 100_0000_0000',
			options: [{number: {groupLength: 4}}]
		},
		{
			code: 'var foo = 0xA_B_C_D_E_1_2_3_4',
			options: [{hexadecimal: {groupLength: 1}}]
		},
		{
			code: 'var foo = 0b111',
			options: [{number: {minimumDigits: 3, groupLength: 1}}]
		}
	],
	invalid: [
		// Hexadecimal
		{
			code: 'var foo = 0xA_B_CDE_F0',
			errors: [error],
			output: 'var foo = 0xA_BC_DE_F0'
		},
		{
			code: 'var foo = 0xABCDEF',
			errors: [error],
			output: 'var foo = 0xAB_CD_EF'
		},
		{
			code: 'var foo = 0xA_B',
			errors: [error],
			output: 'var foo = 0xAB'
		},
		{
			code: 'var foo = 0XAB_C_D',
			errors: [error],
			output: 'var foo = 0XAB_CD'
		},

		// Octal
		{
			code: 'var foo = 0o12_34_5670',
			errors: [error],
			output: 'var foo = 0o1234_5670'
		},
		{
			code: 'var foo = 0o7_7_77',
			errors: [error],
			output: 'var foo = 0o7777'
		},
		{
			code: 'var foo = 0o010101010101',
			errors: [error],
			output: 'var foo = 0o0101_0101_0101'
		},
		{
			code: 'var foo = 0O010101010101',
			errors: [error],
			output: 'var foo = 0O0101_0101_0101'
		},

		// Binary
		{
			code: 'var foo = 0b10_10_0001',
			errors: [error],
			output: 'var foo = 0b1010_0001'
		},
		{
			code: 'var foo = 0b0_00_0',
			errors: [error],
			output: 'var foo = 0b0000'
		},
		{
			code: 'var foo = 0b10101010101010',
			errors: [error],
			output: 'var foo = 0b10_1010_1010_1010'
		},
		{
			code: 'var foo = 0B10101010101010',
			errors: [error],
			output: 'var foo = 0B10_1010_1010_1010'
		},

		// BigInt
		{
			code: 'var foo = 1_9_223n',
			errors: [error],
			output: 'var foo = 19_223n'
		},
		{
			code: 'var foo = 80_7n',
			errors: [error],
			output: 'var foo = 807n'
		},
		{
			code: 'var foo = 123456789_100n',
			errors: [error],
			output: 'var foo = 123_456_789_100n'
		},

		// Numbers
		{
			code: 'var foo = 1_2_345_678',
			errors: [error],
			output: 'var foo = 12_345_678'
		},
		{
			code: 'var foo = 12_3',
			errors: [error],
			output: 'var foo = 123'
		},
		{
			code: 'var foo = 1234567890',
			errors: [error],
			output: 'var foo = 1_234_567_890'
		},

		// Decimal numbers
		{
			code: 'var foo = 9807.1234567',
			errors: [error],
			output: 'var foo = 9807.123_456_7'
		},
		{
			code: 'var foo = 3819.123_4325',
			errors: [error],
			output: 'var foo = 3819.123_432_5'
		},
		{
			code: 'var foo = 138789.12343_2_42',
			errors: [error],
			output: 'var foo = 138_789.123_432_42'
		},
		{
			code: 'var foo = .000000_1',
			errors: [error],
			output: 'var foo = .000_000_1'
		},
		{
			code: 'var foo = 12345678..toString()',
			errors: [error],
			output: 'var foo = 12_345_678..toString()'
		},
		{
			code: 'var foo = 12345678 .toString()',
			errors: [error],
			output: 'var foo = 12_345_678 .toString()'
		},
		{
			code: 'var foo = .00000',
			errors: [error],
			output: 'var foo = .000_00'
		},
		{
			code: 'var foo = 0.00000',
			errors: [error],
			output: 'var foo = 0.000_00'
		},

		// Negative numbers
		{
			code: 'var foo = -100000_1',
			errors: [error],
			output: 'var foo = -1_000_001'
		},

		// Exponential notation
		{
			code: 'var foo = 1e10000',
			errors: [error],
			output: 'var foo = 1e10_000'
		},
		{
			code: 'var foo = 39804e10000',
			errors: [error],
			output: 'var foo = 39_804e10_000'
		},
		{
			code: 'var foo = -123456e100',
			errors: [error],
			output: 'var foo = -123_456e100'
		},
		{
			code: 'var foo = -100000e-10000',
			errors: [error],
			output: 'var foo = -100_000e-10_000'
		},
		{
			code: 'var foo = -1000e+10000',
			errors: [error],
			output: 'var foo = -1000e+10_000'
		},
		{
			code: 'var foo = -1000e+00010000',
			errors: [error],
			output: 'var foo = -1000e+00_010_000'
		},
		{
			code: 'var foo = 3.6e12000',
			errors: [error],
			output: 'var foo = 3.6e12_000'
		},
		{
			code: 'var foo = -1200000e5',
			errors: [error],
			output: 'var foo = -1_200_000e5'
		},
		{
			code: 'var foo = 3.65432E12000',
			errors: [error],
			output: 'var foo = 3.654_32E12_000'
		},

		// Varying options
		{
			code: 'var foo = 1000000',
			options: [{number: {minimumDigits: 6}}],
			errors: [error],
			output: 'var foo = 1_000_000'
		},
		{
			code: 'var foo = 10_000_000_000',
			options: [{number: {groupLength: 4}}],
			errors: [error],
			output: 'var foo = 100_0000_0000'
		},
		{
			code: 'var foo = 0xA_B_CD',
			options: [{hexadecimal: {groupLength: 1}}],
			errors: [error],
			output: 'var foo = 0xA_B_C_D'
		},
		{
			code: 'var foo = 0b1_11',
			options: [{number: {minimumDigits: 3, groupLength: 2}}],
			errors: [error],
			output: 'var foo = 0b111'
		}
	]
});

const visualizeTester = visualizeRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2021
	}
});

visualizeTester.run('numeric-separators-style', rule, [
	'console.log(0XdeEdBeeFn)',
	'var foo = 12345678..toString()'
])
