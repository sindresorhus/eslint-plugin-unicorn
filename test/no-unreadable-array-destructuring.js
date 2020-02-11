import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-unreadable-array-destructuring';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [
	{
		message: 'Array destructuring may not contain consecutive ignored values.'
	}
];

ruleTester.run('no-unreadable-array-destructuring', rule, {
	valid: [
		'const [, foo] = parts;',
		'const [foo] = parts;',
		'const [foo,,bar] = parts;',
		'const [foo,   ,     bar] = parts;',
		'const [foo,] = parts;',
		'const [foo,,] = parts;',
		'const [foo,, bar,, baz] = parts;',
		'function foo([, bar]) {}',
		'function foo([bar]) {}',
		'function foo([bar,,baz]) {}',
		'function foo([bar,   ,     baz]) {}',
		'function foo([bar,]) {}',
		'function foo([bar,,]) {}',
		'function foo([bar,, baz,, qux]) {}',
		'const [, ...rest] = parts;'
	],
	invalid: [
		{
			code: 'const [,, foo] = parts;',
			errors
		},
		{
			code: 'const [foo,,, bar] = parts;',
			errors
		},
		{
			code: 'const [foo,,,] = parts;',
			errors
		},
		{
			code: 'const [foo, bar,, baz ,,, qux] = parts;',
			errors
		},
		{
			code: 'function foo([,, bar]) {}',
			errors
		},
		{
			code: 'function foo([bar,,, baz]) {}',
			errors
		},
		{
			code: 'function foo([bar,,,]) {}',
			errors
		},
		{
			code: 'function foo([bar, baz,, qux ,,, quux]) {}',
			errors
		},
		{
			code: 'const [,,...rest] = parts;',
			errors
		}
	]
});
