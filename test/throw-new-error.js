import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/throw-new-error';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [{ruleId: 'throw-new-error'}];

ruleTester.run('new-error', rule, {
	valid: [
		'throw new Error()',
		'new Error()',
		'throw new TypeError()',
		'throw new CustomeError()',
		'throw new FooBarBazError()',
		'throw new ABCError()'
	],
	invalid: [
		{
			code: 'throw Error()',
			output: 'throw new Error()',
			errors
		},
		{
			code: `throw Error('foo')`,
			output: `throw new Error('foo')`,
			errors
		},
		{
			code: `throw CustomeError('foo')`,
			output: `throw new CustomeError('foo')`,
			errors
		},
		{
			code: `throw FooBarBazError('foo')`,
			output: `throw new FooBarBazError('foo')`,
			errors
		},
		{
			code: `throw fooBarBazError('foo')`,
			output: `throw new fooBarBazError('foo')`,
			errors
		},
		{
			code: `throw ABCError('foo')`,
			output: `throw new ABCError('foo')`,
			errors
		},
		{
			code: `throw Abc3Error('foo')`,
			output: `throw new Abc3Error('foo')`,
			errors
		},
		{
			code: `throw TypeError()`,
			output: 'throw new TypeError()',
			errors
		}
	]
});
