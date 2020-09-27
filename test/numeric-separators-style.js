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
			code: 'var foo = 0xAB_CD',
			options: [{hexadecimal: {minimumThreshold: 0, preferedGroupLength: 2}}]
		},
		{
			code: 'var foo = 0xAB',
			options: [{hexadecimal: {minimumThreshold: 0, preferedGroupLength: 2}}]
		},
		{
			code: 'var foo = 0xA',
			options: [{hexadecimal: {minimumThreshold: 0, preferedGroupLength: 2}}]
		},
		{
			code: 'var foo = 0xA_BC_DE_F0',
			options: [{hexadecimal: {minimumThreshold: 0, preferedGroupLength: 2}}]
		},
		{
			code: 'var foo = 0o1234_5670',
			options: [{octal: {minimumThreshold: 0, preferedGroupLength: 4}}]
		},
		{
			code: 'var foo = 0o7777',
			options: [{octal: {minimumThreshold: 0, preferedGroupLength: 4}}]
		},
		{
			code: 'var foo = 0o01',
			options: [{octal: {minimumThreshold: 0, preferedGroupLength: 4}}]
		},
		{
			code: 'var foo = 0o12_7000_0000',
			options: [{octal: {minimumThreshold: 0, preferedGroupLength: 4}}]
		},
		{
			code: 'var foo = 0777777',
			options: [{octal: {minimumThreshold: 0, preferedGroupLength: 4}}]
		},
		{
			code: 'var foo = 0111222',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 0b1010_0001_1000_0101',
			options: [{binary: {minimumThreshold: 0, preferedGroupLength: 4}}]
		},
		{
			code: 'var foo = 0b0000',
			options: [{binary: {minimumThreshold: 0, preferedGroupLength: 4}}]
		},
		{
			code: 'var foo = 0b10',
			options: [{binary: {minimumThreshold: 0, preferedGroupLength: 4}}]
		},
		{
			code: 'var foo = 0b1_0111_0101_0101',
			options: [{binary: {minimumThreshold: 0, preferedGroupLength: 4}}]
		},
		{
			code: 'var foo = 0b1010n',
			options: [{binary: {minimumThreshold: 0, preferedGroupLength: 4}, bigint: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 0b1010_1010n',
			options: [{binary: {minimumThreshold: 0, preferedGroupLength: 4}, bigint: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 9_223_372_036_854_775_807n',
			options: [{bigint: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 807n',
			options: [{bigint: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 1n',
			options: [{bigint: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 9_372_854_807n',
			options: [{bigint: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 9807n',
			options: [{bigint: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 12_345_678',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 123',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 1',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 1_234',
			options: [{number: {minimumThreshold: 0, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 1234',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 9807.123',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 3819.123_432',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 138_789.123_432_42',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = .000_000_1',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = -3000',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = -10_000_000',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 1e10_000',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 39_804e1000',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = -123_456e-100',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = -100_000e-100_000',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = 3.6e12_000',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = -1_200_000e5',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		},
		{
			code: 'var foo = -282_932 - (1938 / 10_000) * .1 + 18.100_000_2',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}]
		}
	],
	invalid: [
		{
			code: 'var foo = 0xA_B_CDE_F0',
			options: [{hexadecimal: {minimumThreshold: 0, preferedGroupLength: 2}}],
			errors: [error],
			output: 'var foo = 0xA_BC_DE_F0'
		},
		{
			code: 'var foo = 0xABCDEF',
			options: [{hexadecimal: {minimumThreshold: 0, preferedGroupLength: 2}}],
			errors: [error],
			output: 'var foo = 0xAB_CD_EF'
		},
		{
			code: 'var foo = 0xA_B',
			options: [{hexadecimal: {minimumThreshold: 0, preferedGroupLength: 2}}],
			errors: [error],
			output: 'var foo = 0xAB'
		},
		{
			code: 'var foo = 0o12_34_5670',
			options: [{octal: {minimumThreshold: 0, preferedGroupLength: 4}}],
			errors: [error],
			output: 'var foo = 0o1234_5670'
		},
		{
			code: 'var foo = 0o7_7_77',
			options: [{octal: {minimumThreshold: 0, preferedGroupLength: 4}}],
			errors: [error],
			output: 'var foo = 0o7777'
		},
		{
			code: 'var foo = 0o010101010101',
			options: [{octal: {minimumThreshold: 0, preferedGroupLength: 4}}],
			errors: [error],
			output: 'var foo = 0o0101_0101_0101'
		},
		{
			code: 'var foo = 0b10_10_0001',
			options: [{binary: {minimumThreshold: 0, preferedGroupLength: 4}}],
			errors: [error],
			output: 'var foo = 0b1010_0001'
		},
		{
			code: 'var foo = 0b0_00_0',
			options: [{binary: {minimumThreshold: 0, preferedGroupLength: 4}}],
			errors: [error],
			output: 'var foo = 0b0000'
		},
		{
			code: 'var foo = 0b10101010101010',
			options: [{binary: {minimumThreshold: 0, preferedGroupLength: 4}}],
			errors: [error],
			output: 'var foo = 0b10_1010_1010_1010'
		},
		{
			code: 'var foo = 1_9_223n',
			options: [{bigint: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = 19_223n'
		},
		{
			code: 'var foo = 80_7n',
			options: [{bigint: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = 807n'
		},
		{
			code: 'var foo = 123456789_100n',
			options: [{bigint: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = 123_456_789_100n'
		},
		{
			code: 'var foo = 1_2_345_678',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = 12_345_678'
		},
		{
			code: 'var foo = 12_3',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = 123'
		},
		{
			code: 'var foo = 1234567890',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = 1_234_567_890'
		},
		{
			code: 'var foo = 9807.1234567',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = 9807.123_456_7'
		},
		{
			code: 'var foo = 3819.123_4325',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = 3819.123_432_5'
		},
		{
			code: 'var foo = 138789.12343_2_42',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = 138_789.123_432_42'
		},
		{
			code: 'var foo = .000000_1',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = .000_000_1'
		},
		{
			code: 'var foo = -100000_1',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = -1_000_001'
		},
		{
			code: 'var foo = 1e10000',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = 1e10_000'
		},
		{
			code: 'var foo = 39804e10000',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = 39_804e10_000'
		},
		{
			code: 'var foo = -123456e100',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = -123_456e100'
		},
		{
			code: 'var foo = -100000e-10000',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = -100_000e-10_000'
		},
		{
			code: 'var foo = 3.6e12000',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = 3.6e12_000'
		},
		{
			code: 'var foo = -1200000e5',
			options: [{number: {minimumThreshold: 5, preferedGroupLength: 3}}],
			errors: [error],
			output: 'var foo = -1_200_000e5'
		}
	]
});
