import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const MESSAGE_ID = 'prefer-reflect-apply';

const errors = [
	{
		messageId: MESSAGE_ID,
	},
];

test({
	valid: [
		// `super` is not a valid standalone expression
		'class A extends B { m() { return super.apply(null, [1]); } }',
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
		'Reflect.apply(foo, null, [bar]);',
		// Currently, we are not passing `scope` to `getStaticValue`, so the method is unknown
		'const apply = "apply"; foo[apply](null, [42]);',
	],
	invalid: [
		{
			code: 'foo.apply(null, [42]);',
			output: 'Reflect.apply(foo, null, [42]);',
			errors,
		},
		{
			// Empty array argument list
			code: 'foo.apply(null, []);',
			output: 'Reflect.apply(foo, null, []);',
			errors,
		},
		{
			// Parenthesized callee object
			code: '(foo.bar).apply(null, [42]);',
			output: 'Reflect.apply(foo.bar, null, [42]);',
			errors,
		},
		{
			code: 'foo.bar.apply(null, [42]);',
			output: 'Reflect.apply(foo.bar, null, [42]);',
			errors,
		},
		{
			code: 'Function.prototype.apply.call(foo, null, [42]);',
			output: 'Reflect.apply(foo, null, [42]);',
			errors,
		},
		{
			code: 'Function.prototype.apply.call(foo.bar, null, [42]);',
			output: 'Reflect.apply(foo.bar, null, [42]);',
			errors,
		},
		{
			code: 'foo.apply(null, arguments);',
			output: 'Reflect.apply(foo, null, arguments);',
			errors,
		},
		{
			code: 'Function.prototype.apply.call(foo, null, arguments);',
			output: 'Reflect.apply(foo, null, arguments);',
			errors,
		},
		{
			code: 'foo.apply(this, [42]);',
			output: 'Reflect.apply(foo, this, [42]);',
			errors,
		},
		{
			code: 'Function.prototype.apply.call(foo, this, [42]);',
			output: 'Reflect.apply(foo, this, [42]);',
			errors,
		},
		{
			code: 'foo.apply(this, arguments);',
			output: 'Reflect.apply(foo, this, arguments);',
			errors,
		},
		{
			code: 'Function.prototype.apply.call(foo, this, arguments);',
			output: 'Reflect.apply(foo, this, arguments);',
			errors,
		},
		{
			code: 'foo["apply"](null, [42]);',
			output: 'Reflect.apply(foo, null, [42]);',
			errors,
		},

		// A parenthesized sequence expression target must keep its parentheses
		{
			code: '(0, fn).apply(this, []);',
			output: 'Reflect.apply((0, fn), this, []);',
			errors: 1,
		},
		{
			code: 'Function.prototype.apply.call((0, fn), this, []);',
			output: 'Reflect.apply((0, fn), this, []);',
			errors: 1,
		},
		{
			code: '(a, b).apply(null, [1]);',
			output: 'Reflect.apply((a, b), null, [1]);',
			errors: 1,
		},

		// A comment in the call is preserved by not fixing
		{
			code: 'fn.apply(/* keep */ this, []);',
			errors: 1,
		},
		{
			code: 'fn.apply(this, /* keep */ []);',
			errors: 1,
		},
		{
			code: 'fn /* keep */.apply(this, []);',
			errors: 1,
		},
		// `super` is not a valid standalone expression
		{
			code: 'class A extends B { m() { return super.method.apply(this, [1]); } }',
			output: 'class A extends B { m() { return Reflect.apply(super.method, this, [1]); } }',
			errors: 1,
		},
	],
});
