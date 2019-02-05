import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-reflect-apply';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = {
	ruleId: 'prefer-reflect-apply',
	message: 'Prefer Reflect.apply over Function.prototype.apply.'
};

ruleTester.run('prefer-reflect-apply', rule, {
	valid: [
		'foo.apply();',
		'foo.apply(null);',
		'foo.apply(null, 42);',
		'[].apply(null, [42]);',
		'foo.apply(bar);',
		'foo.apply(bar, []);',
		'foo.apply;',
		'apply;',
		'Reflect.apply(foo, null);',
		'Reflect.apply(foo, null, [bar]);'
	],
	invalid: [
		{
			code: 'foo.apply(null, [42]);',
			errors: [error],
			output: 'Reflect.apply(foo, null, [42]);'
		},
		{
			code: 'foo.bar.apply(null, [42]);',
			errors: [error],
			output: 'Reflect.apply(foo.bar, null, [42]);'
		},
		{
			code: 'Function.prototype.apply.call(foo, null, [42]);',
			errors: [error],
			output: 'Reflect.apply(foo, null, [42]);'
		},
		{
			code: 'Function.prototype.apply.call(foo.bar, null, [42]);',
			errors: [error],
			output: 'Reflect.apply(foo.bar, null, [42]);'
		}
	]
});
