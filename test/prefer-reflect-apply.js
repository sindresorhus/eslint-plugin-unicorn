import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-reflect-apply';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [
	{
	}
];

ruleTester.run('prefer-reflect-apply', rule, {
	valid: [
		'foo.apply();',
		'foo.apply(null);',
		'foo.apply(this);',
		'foo.apply(null, 42);',
		'foo.apply(this, 42);',
		'foo.apply(bar, arguments);',
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
			output: 'Reflect.apply(foo, null, [42]);',
			errors
		},
		{
			code: 'foo.bar.apply(null, [42]);',
			output: 'Reflect.apply(foo.bar, null, [42]);',
			errors
		},
		{
			code: 'Function.prototype.apply.call(foo, null, [42]);',
			output: 'Reflect.apply(foo, null, [42]);',
			errors
		},
		{
			code: 'Function.prototype.apply.call(foo.bar, null, [42]);',
			output: 'Reflect.apply(foo.bar, null, [42]);',
			errors
		},
		{
			code: 'foo.apply(null, arguments);',
			output: 'Reflect.apply(foo, null, arguments);',
			errors
		},
		{
			code: 'Function.prototype.apply.call(foo, null, arguments);',
			output: 'Reflect.apply(foo, null, arguments);',
			errors
		},
		{
			code: 'foo.apply(this, [42]);',
			output: 'Reflect.apply(foo, this, [42]);',
			errors
		},
		{
			code: 'Function.prototype.apply.call(foo, this, [42]);',
			output: 'Reflect.apply(foo, this, [42]);',
			errors
		},
		{
			code: 'foo.apply(this, arguments);',
			output: 'Reflect.apply(foo, this, arguments);',
			errors
		},
		{
			code: 'Function.prototype.apply.call(foo, this, arguments);',
			output: 'Reflect.apply(foo, this, arguments);',
			errors
		}
	]
});
