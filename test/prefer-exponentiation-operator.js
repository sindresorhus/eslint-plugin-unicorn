import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-exponentiation-operator';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2019
	}
});

const message = 'Prefer the exponentiation operator over `Math.pow()`.';

ruleTester.run('prefer-exponentiation-operator', rule, {
	valid: [
		'a ** b;',
		'2 ** 4;'
	],
	invalid: [
		{
			code: 'const x = Math.pow(2, 4);',
			errors: [{message}],
			output: 'const x = 2 ** 4;'
		},
		{
			code: 'const x = Math.pow(-2, (2 - 4) +0 -0.2);',
			errors: [{message}],
			output: 'const x = -2 ** ((2 - 4) +0 -0.2);'
		},
		{
			code: 'const x = Math.pow(Math.pow(2, 4), 8);',
			errors: [
				{message, column: 11, line: 1},
				{message, column: 20, line: 1}
			],
			output: 'const x = Math.pow(2, 4) ** 8;'
		},
		{
			code: 'const x = Math.pow(2, b);',
			errors: [{message}],
			output: 'const x = 2 ** b;'
		},
		{
			code: 'const x = Math.pow(c, 4);',
			errors: [{message}],
			output: 'const x = c ** 4;'
		},
		{
			code: 'const x = Math.pow(foo(), bar());',
			errors: [{message}],
			output: 'const x = foo() ** bar();'
		},
		{
			code: 'const x = Math.pow(-2, 2 - 4);',
			errors: [{message}],
			output: 'const x = -2 ** (2 - 4);'
		},
		{
			code: 'const x = Math.pow(4 - 2, 2 - 4);',
			errors: [{message}],
			output: 'const x = (4 - 2) ** (2 - 4);'
		},
		{
			code: 'const x = Math.pow(\n2,\n2);',
			errors: [{message}],
			output: 'const x = 2 ** 2;'
		},
		{
			code: 'const x = Math.pow(\n2,2 +\n2);',
			errors: [{message}],
			output: 'const x = 2 ** (2 +\n2);'
		},
		{
			code: 'const x = Math.pow(\n2, // foo\n2);',
			errors: [{message}],
			output: 'const x = Math.pow(\n2, // foo\n2);'
		},
		{
			code: 'const x = Math.pow(// foo\n2, 2);',
			errors: [{message}],
			output: 'const x = Math.pow(// foo\n2, 2);'
		}
	]
});
