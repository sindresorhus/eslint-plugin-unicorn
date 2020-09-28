import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/numeric-separators-style';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2021
	}
});

const error = {
	message: 'Invalid group length in numeric value.'
};

// Most of these test cases copied from:
// https://github.com/eslint/eslint/blob/master/tests/lib/rules/camelcase.js
ruleTester.run('numeric-separators-style', rule, {
	valid: [
		{
			code: 'var foo = 0xAB_CD'
		},
		{
			code: 'var foo = 0xAB'
		},
		{
			code: 'var foo = 0xA'
		},
		{
			code: 'var foo = 0xA_BC_DE_F0'
		},
		{
			code: 'var foo = 0xab_e8_12'
		},
		{
			code: 'var foo = 0xe'
		},
		{
			code: 'var foo = 0o1234_5670'
		},
		{
			code: 'var foo = 0o7777'
		},
		{
			code: 'var foo = 0o01'
		},
		{
			code: 'var foo = 0o12_7000_0000'
		},
		{
			code: 'var foo = 0777777'
		},
		{
			code: 'var foo = 0999999'
		},
		{
			code: 'var foo = 0111222'
		},
		{
			code: 'var foo = 0b1010_0001_1000_0101'
		},
		{
			code: 'var foo = 0b0000'
		},
		{
			code: 'var foo = 0b10'
		},
		{
			code: 'var foo = 0b1_0111_0101_0101'
		},
		{
			code: 'var foo = 0b1010n'
		},
		{
			code: 'var foo = 0b1010_1010n'
		},
		{
			code: 'var foo = 9_223_372_036_854_775_807n'
		},
		{
			code: 'var foo = 807n'
		},
		{
			code: 'var foo = 1n'
		},
		{
			code: 'var foo = 9_372_854_807n'
		},
		{
			code: 'var foo = 9807n'
		},
		{
			code: 'var foo = 0n'
		},
		{
			code: 'var foo = 12_345_678'
		},
		{
			code: 'var foo = 123'
		},
		{
			code: 'var foo = 1'
		},
		{
			code: 'var foo = 1_234',
			options: [{number: {minimumDigits: 0, groupLength: 3}}]
		},
		{
			code: 'var foo = 1234'
		},
		{
			code: 'var foo = 9807.123'
		},
		{
			code: 'var foo = 3819.123_432'
		},
		{
			code: 'var foo = 138_789.123_432_42'
		},
		{
			code: 'var foo = .000_000_1'
		},
		{
			code: 'var foo = -3000'
		},
		{
			code: 'var foo = -10_000_000'
		},
		{
			code: 'var foo = 1e10_000'
		},
		{
			code: 'var foo = 39_804e1000'
		},
		{
			code: 'var foo = -123_456e-100'
		},
		{
			code: 'var foo = -100_000e-100_000'
		},
		{
			code: 'var foo = -100_000e+100_000'
		},
		{
			code: 'var foo = 3.6e12_000'
		},
		{
			code: 'var foo = 3.6E12_000'
		},
		{
			code: 'var foo = -1_200_000e5'
		},
		{
			code: 'var foo = -282_932 - (1938 / 10_000) * .1 + 18.100_000_2'
		},
		{
			code: 'var foo = NaN'
		},
		{
			code: 'var foo = Infinity'
		}
	],
	invalid: [
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
		{
			code: 'var foo = -100000_1',
			errors: [error],
			output: 'var foo = -1_000_001'
		},
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
		}
	]
});
