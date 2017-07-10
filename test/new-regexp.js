import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/new-regexp';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = {
	ruleId: 'new-regexp',
	message: 'Use `new RegExp()` instead of `RegExp()`'
};

ruleTester.run('new-regexp', rule, {
	valid: [
		`const foo = new RegExp('foo', 'g')`,
		`const foo = new RegExp('foo')`,
		`const foo = new RegExp(/foo/, 'g')`,
		`new RegExp('foo', 'g').exec('foo')`
	],
	invalid: [
		{
			code: `const foo = RegExp('foo', 'g')`,
			errors: [error],
			output: `const foo = new RegExp('foo', 'g')`
		},
		{
			code: `const foo = RegExp('foo')`,
			errors: [error],
			output: `const foo = new RegExp('foo')`
		},
		{
			code: `const foo = RegExp(/foo/, 'g')`,
			errors: [error],
			output: `const foo = new RegExp(/foo/, 'g')`
		},
		{
			code: `RegExp('foo', 'g').exec('foo')`,
			errors: [error],
			output: `new RegExp('foo', 'g').exec('foo')`
		}
	]
});
