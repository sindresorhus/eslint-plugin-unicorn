import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-unreadable-array-destructuring';
import visualizeRuleTester from './utils/visualize-rule-tester';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [
	{
		messageId: 'no-unreadable-array-destructuring'
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
const visualizeTester = visualizeRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2021
	}
});

visualizeTester.run('no-unreadable-array-destructuring', rule, [
	'const [foo, bar,, baz ,,, qux] = parts;'
]);
