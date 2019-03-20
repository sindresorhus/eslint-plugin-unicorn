import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-zero-fractions';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const errorZeroFraction = {
	ruleId: 'no-zero-fractions',
	message: 'Don\'t use a zero fraction in the number.'
};
const errorDanglingDot = {
	ruleId: 'no-zero-fractions',
	message: 'Don\'t use a dangling dot in the number.'
};

ruleTester.run('no-zero-fractions', rule, {
	valid: [
		'const foo = "123.1000"',
		'foo("123.1000")',
		'const foo = 1',
		'const foo = 1 + 2',
		'const foo = -1',
		'const foo = 123123123',
		'const foo = 1.1',
		'const foo = -1.1',
		'const foo = 123123123.4',
		'const foo = 1e3'
	],
	invalid: [
		{
			code: 'const foo = 1.0',
			output: 'const foo = 1',
			errors: [errorZeroFraction]
		},
		{
			code: 'const foo = 1.0 + 1',
			output: 'const foo = 1 + 1',
			errors: [errorZeroFraction]
		},
		{
			code: 'foo(1.0 + 1)',
			output: 'foo(1 + 1)',
			errors: [errorZeroFraction]
		},
		{
			code: 'const foo = 1.00',
			output: 'const foo = 1',
			errors: [errorZeroFraction]
		},
		{
			code: 'const foo = 1.00000',
			output: 'const foo = 1',
			errors: [errorZeroFraction]
		},
		{
			code: 'const foo = -1.0',
			output: 'const foo = -1',
			errors: [errorZeroFraction]
		},
		{
			code: 'const foo = 123123123.0',
			output: 'const foo = 123123123',
			errors: [errorZeroFraction]
		},
		{
			code: 'const foo = 123.11100000000',
			output: 'const foo = 123.111',
			errors: [errorZeroFraction]
		},
		{
			code: 'const foo = 1.',
			output: 'const foo = 1',
			errors: [errorDanglingDot]
		},
		{
			code: 'const foo = +1.',
			output: 'const foo = +1',
			errors: [errorDanglingDot]
		},
		{
			code: 'const foo = -1.',
			output: 'const foo = -1',
			errors: [errorDanglingDot]
		},
		{
			code: 'const foo = 1.e10',
			output: 'const foo = 1e10',
			errors: [errorDanglingDot]
		},
		{
			code: 'const foo = +1.e-10',
			output: 'const foo = +1e-10',
			errors: [errorDanglingDot]
		},
		{
			code: 'const foo = -1.e+10',
			output: 'const foo = -1e+10',
			errors: [errorDanglingDot]
		}
	]
});
