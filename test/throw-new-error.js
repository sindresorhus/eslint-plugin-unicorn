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
		'throw new TypeError()'
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
			code: `throw TypeError()`,
			output: 'throw new TypeError()',
			errors
		}
	]
});
