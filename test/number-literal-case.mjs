import {createRequire} from 'module';
import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test: runTest, rule} = getTester(import.meta);
const require = createRequire(import.meta.url);

const MESSAGE_ID = 'number-literal-case';
const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		ecmaVersion: 2021
	}
});
const babelRuleTester = avaRuleTester(test, {
	parser: require.resolve('babel-eslint')
});
const typescriptRuleTester = avaRuleTester(test, {
	parser: require.resolve('@typescript-eslint/parser')
});

const error = {
	messageId: MESSAGE_ID
};

// Legacy octal literals
ruleTester.run('number-literal-case', rule, {
	valid: [
		'const foo = 0777',
		'const foo = 0888'
	],
	invalid: []
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
		'const foo = 0xDEED_BEEFn'
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
		// `0n`
		{
			code: 'const foo = 0B0n',
			errors: [error],
			output: 'const foo = 0b0n'
		},
		{
			code: 'const foo = 0O0n',
			errors: [error],
			output: 'const foo = 0o0n'
		},
		{
			code: 'const foo = 0X0n',
			errors: [error],
			output: 'const foo = 0x0n'
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
		},

		// Numeric separator
		{
			code: 'const foo = 0XdeEd_Beefn',
			errors: [error],
			output: 'const foo = 0xDEED_BEEFn'
		}
	]
};

ruleTester.run('number-literal-case', rule, tests);
babelRuleTester.run('number-literal-case', rule, tests);
typescriptRuleTester.run('number-literal-case', rule, tests);

runTest.snapshot({
	valid: [],
	invalid: [
		'console.log(BigInt(0B10 + 1.2E+3) + 0XdeEd_Beefn)'
	]
});
