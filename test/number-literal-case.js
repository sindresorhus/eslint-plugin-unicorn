import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/number-literal-case';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		ecmaVersion: 2020
	}
});

const error = {
	ruleId: 'number-literal-case',
	message: 'Invalid number literal casing.'
};

// TODO: Add numeric separator tests when ESLint supports it.
ruleTester.run('number-literal-case', rule, {
	valid: [
		// Number
		'const foo = 1234',
		'const foo = 0777',
		'const foo = 0888',
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
		'const foo = \'0Xffn\''
	],
	invalid: [
		// Number
		{
			code: 'const foo = 0B10',
			errors: [error],
			output: 'const foo = 0b10'
		},
		{
			code: 'const foo = 0O1234567',
			errors: [error],
			output: 'const foo = 0o1234567'
		},
		{
			code: 'const foo = 0XaBcDeF',
			errors: [error],
			output: 'const foo = 0xABCDEF'
		},

		// BigInt
		{
			code: 'const foo = 0B10n',
			errors: [error],
			output: 'const foo = 0b10n'
		},
		{
			code: 'const foo = 0O1234567n',
			errors: [error],
			output: 'const foo = 0o1234567n'
		},
		{
			code: 'const foo = 0XaBcDeFn',
			errors: [error],
			output: 'const foo = 0xABCDEFn'
		},

		// Exponential notation
		{
			code: 'const foo = 1.2E3',
			errors: [error],
			output: 'const foo = 1.2e3'
		},
		{
			code: 'const foo = 1.2E-3',
			errors: [error],
			output: 'const foo = 1.2e-3'
		},
		{
			code: 'const foo = 1.2E+3',
			errors: [error],
			output: 'const foo = 1.2e+3'
		},
		{
			code: outdent`
				const foo = 255;

				if (foo === 0xff) {
					console.log('invalid');
				}
			`,
			errors: [error],
			output: outdent`
				const foo = 255;

				if (foo === 0xFF) {
					console.log('invalid');
				}
			`
		}
	]
});
