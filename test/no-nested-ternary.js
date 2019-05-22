import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-nested-ternary';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [{ruleId: 'my-rule'}];

ruleTester.run('new-error', rule, {
	valid: [
		'var foo = i > 5 ? true : false;',
		'var foo = i > 5 ? true : (i < 100 ? true : false);',
		'var foo = i > 5 ? (i < 100 ? true : false) : true;',
		'var foo = i > 5 ? (i < 100 ? true : false) : (i < 100 ? true : false);',
		'var foo = i > 5 ? true : (i < 100 ? FOO(i > 50 ? false : true) : false);'

	],
	invalid: [
		{
			code: 'var foo = i > 5 ? true : (i < 100 ? true : (i < 1000 ? true : false));',
			errors
		},
		{
			code: 'var foo = i > 5 ? true : (i < 100 ? (i > 50 ? false : true) : false);',
			errors
		},
		{
			code: 'var foo = i > 5 ? i < 100 ? true : false : true;',
			output: 'var foo = i > 5 ? (i < 100 ? true : false) : true;',
			errors
		},
		{
			code: 'var foo = i > 5 ? i < 100 ? true : false : i < 100 ? true : false;',
			output: 'var foo = i > 5 ? (i < 100 ? true : false) : (i < 100 ? true : false);',
			errors: [{ruleId: 'my-rule', column: 19}, {ruleId: 'my-rule', column: 44}]
		},
		{
			code: 'var foo = i > 5 ? true : i < 100 ? true : false;',
			output: 'var foo = i > 5 ? true : (i < 100 ? true : false);',
			errors
		}
	]
});
