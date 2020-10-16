import {test} from './utils/test';

const errors = [
	{
		messageId: 'no-unreadable-array-destructuring'
	}
];

test({
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
		'const [, ...rest] = parts;',
		// This is stupid, but valid code
		'const [,,] = parts;'
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
		},
		// This is stupid, but valid code
		{
			code: 'const [,,,] = parts;',
			errors
		}
	]
});

test.visualize([
	'const [foo, bar,, baz ,,, qux] = parts;'
]);
