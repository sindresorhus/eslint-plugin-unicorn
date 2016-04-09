import test from 'ava';
import {RuleTester} from 'eslint';
import rule from '../rules/throw-new-error';

const ruleTester = new RuleTester({
	env: {
		es6: true
	}
});

const errors = [{ruleId: 'throw-new-error'}];

test(() => {
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
});
