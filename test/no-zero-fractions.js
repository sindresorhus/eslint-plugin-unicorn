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

const error = {
	ruleId: 'no-zero-fractions',
	message: 'Zero fraction or dangling dot in number.'
};

ruleTester.run('no-zero-fractions', rule, {
	valid: [
		'const foo = 1',
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
			errors: [error]
		},
		{
			code: 'const foo = 1.00',
			output: 'const foo = 1',
			errors: [error]
		},
		{
			code: 'const foo = 1.00000',
			output: 'const foo = 1',
			errors: [error]
		},
		{
			code: 'const foo = -1.0',
			output: 'const foo = -1',
			errors: [error]
		},
		{
			code: 'const foo = 123123123.0',
			output: 'const foo = 123123123',
			errors: [error]
		},
		{
			code: 'const foo = 1.',
			output: 'const foo = 1',
			errors: [error]
		}
	]
});
