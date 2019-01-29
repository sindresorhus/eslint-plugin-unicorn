import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-hex-escape';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = {
	ruleId: 'no-hex-escape',
	message: 'Use unicode escapes instead of hexadecimal escapes.'
};

ruleTester.run('no-hex-escape', rule, {
	valid: [
		'const foo = \'foo\'',
		'const foo = \'\\u00b1\'',
		'const foo = \'\\u00b1\\u00b1\'',
		'const foo = \'foo\\u00b1\'',
		'const foo = \'foo\\u00b1foo\'',
		'const foo = \'\\u00b1foo\'',
		'const foo = \'\\\\xb1\'',
		'const foo = \'\\\\\\\\xb1\'',
		'const foo = \'foo\\\\xb1\'',
		'const foo = \'foo\\\\\\\\xb1\'',
		'const foo = \'\\\\xd8\\\\x3d\\\\xdc\\\\xa9\'',
		'const foo = \'foo\\\\x12foo\\\\x34\'',
		'const foo = \'\\\\\\\\xd8\\\\\\\\x3d\\\\\\\\xdc\\\\\\\\xa9\'',
		'const foo = \'foo\\\\\\\\x12foo\\\\\\\\x34\'',
		'const foo = 42',
		'const foo = `foo`',
		'const foo = `\\u00b1`',
		'const foo = `\\u00b1\\u00b1`',
		'const foo = `foo\\u00b1`',
		'const foo = `foo\\u00b1foo`',
		'const foo = `\\u00b1foo`',
		'const foo = `42`',
		'const foo = `\\\\xb1`',
		'const foo = `\\\\\\\\xb1`',
		'const foo = `foo\\\\xb1`',
		'const foo = `foo\\\\\\\\xb1`',
		'const foo = `\\\\xd8\\\\x3d\\\\xdc\\\\xa9`',
		'const foo = `foo\\\\x12foo\\\\x34`',
		'const foo = `\\\\\\\\xd8\\\\\\\\x3d\\\\\\\\xdc\\\\\\\\xa9`',
		'const foo = `foo\\\\\\\\x12foo\\\\\\\\x34`'
	],
	invalid: [
		{
			code: 'const foo = \'\\xb1\'',
			errors: [error],
			output: 'const foo = \'\\u00b1\''
		},
		{
			code: 'const foo = \'\\\\\\xb1\'',
			errors: [error],
			output: 'const foo = \'\\\\\\u00b1\''
		},
		{
			code: 'const foo = \'\\xb1\\xb1\'',
			errors: [error],
			output: 'const foo = \'\\u00b1\\u00b1\''
		},
		{
			code: 'const foo = \'\\\\\\xb1\\\\\\xb1\'',
			errors: [error],
			output: 'const foo = \'\\\\\\u00b1\\\\\\u00b1\''
		},
		{
			code: 'const foo = \'\\\\\\xb1\\\\\\\\xb1\'',
			errors: [error],
			output: 'const foo = \'\\\\\\u00b1\\\\\\\\xb1\''
		},
		{
			code: 'const foo = \'\\\\\\\\\\xb1\\\\\\xb1\'',
			errors: [error],
			output: 'const foo = \'\\\\\\\\\\u00b1\\\\\\u00b1\''
		},
		{
			code: 'const foo = \'\\xb1foo\'',
			errors: [error],
			output: 'const foo = \'\\u00b1foo\''
		},
		{
			code: 'const foo = \'\\xd8\\x3d\\xdc\\xa9\'',
			errors: [error],
			output: 'const foo = \'\\u00d8\\u003d\\u00dc\\u00a9\''
		},
		{
			code: 'const foo = \'foo\\xb1\'',
			errors: [error],
			output: 'const foo = \'foo\\u00b1\''
		},
		{
			code: 'const foo = \'foo\\\\\\xb1\'',
			errors: [error],
			output: 'const foo = \'foo\\\\\\u00b1\''
		},
		{
			code: 'const foo = \'foo\\\\\\\\\\xb1\'',
			errors: [error],
			output: 'const foo = \'foo\\\\\\\\\\u00b1\''
		},
		{
			code: 'const foo = \'foo\\x12foo\\x34\'',
			errors: [error],
			output: 'const foo = \'foo\\u0012foo\\u0034\''
		},
		{
			code: 'const foo = \'42\\x1242\\x34\'',
			errors: [error],
			output: 'const foo = \'42\\u001242\\u0034\''
		},
		{
			code: 'const foo = \'42\\\\\\x1242\\\\\\x34\'',
			errors: [error],
			output: 'const foo = \'42\\\\\\u001242\\\\\\u0034\''
		},
		// Test template literals
		{
			code: 'const foo = `\\xb1`',
			errors: [error],
			output: 'const foo = `\\u00b1`'
		},
		{
			code: 'const foo = `\\\\\\xb1`',
			errors: [error],
			output: 'const foo = `\\\\\\u00b1`'
		},
		{
			code: 'const foo = `\\xb1\\xb1`',
			errors: [error],
			output: 'const foo = `\\u00b1\\u00b1`'
		},
		{
			code: 'const foo = `\\\\\\xb1\\\\\\xb1`',
			errors: [error],
			output: 'const foo = `\\\\\\u00b1\\\\\\u00b1`'
		},
		{
			code: 'const foo = `\\\\\\\\\\xb1\\\\\\xb1`',
			errors: [error],
			output: 'const foo = `\\\\\\\\\\u00b1\\\\\\u00b1`'
		},
		{
			code: 'const foo = `\\\\\\\\\\xb1\\\\\\\\xb1`',
			errors: [error],
			output: 'const foo = `\\\\\\\\\\u00b1\\\\\\\\xb1`'
		},
		{
			code: 'const foo = `\\xb1foo`',
			errors: [error],
			output: 'const foo = `\\u00b1foo`'
		},
		{
			code: 'const foo = `\\xd8\\x3d\\xdc\\xa9`',
			errors: [error],
			output: 'const foo = `\\u00d8\\u003d\\u00dc\\u00a9`'
		},
		{
			code: 'const foo = `foo\\xb1`',
			errors: [error],
			output: 'const foo = `foo\\u00b1`'
		},
		{
			code: 'const foo = `foo\\\\\\xb1`',
			errors: [error],
			output: 'const foo = `foo\\\\\\u00b1`'
		},
		{
			code: 'const foo = `foo\\\\\\\\\\xb1`',
			errors: [error],
			output: 'const foo = `foo\\\\\\\\\\u00b1`'
		},
		{
			code: 'const foo = `foo\\x12foo\\x34`',
			errors: [error],
			output: 'const foo = `foo\\u0012foo\\u0034`'
		},
		{
			code: 'const foo = `42\\x1242\\x34`',
			errors: [error],
			output: 'const foo = `42\\u001242\\u0034`'
		},
		{
			code: 'const foo = `42\\\\\\x1242\\\\\\x34`',
			errors: [error],
			output: 'const foo = `42\\\\\\u001242\\\\\\u0034`'
		}
	]
});
