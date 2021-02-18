import {createRequire} from 'module';
import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {getTester} from './utils/test.js';

const {test: runTest, rule} = getTester(import.meta);
const require = createRequire(import.meta.url);

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const babelRuleTester = avaRuleTester(test, {
	parser: require.resolve('babel-eslint')
});
const typescriptRuleTester = avaRuleTester(test, {
	parser: require.resolve('@typescript-eslint/parser')
});

const error = {
	messageId: 'no-hex-escape'
};

const tests = {
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
		{
			code: 'const foo = /^[\\x20-\\x7E]*$/',
			errors: [error],
			output: 'const foo = /^[\\u0020-\\u007E]*$/'
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
		},
		{
			// eslint-disable-next-line no-template-curly-in-string
			code: 'const foo = `\\xb1${foo}\\xb1${foo}`',
			errors: [error, error],
			// eslint-disable-next-line no-template-curly-in-string
			output: 'const foo = `\\u00b1${foo}\\u00b1${foo}`'
		}
	]
};

ruleTester.run('no-hex-escape', rule, tests);
babelRuleTester.run('no-hex-escape', rule, tests);
typescriptRuleTester.run('no-hex-escape', rule, tests);

runTest.snapshot([
	'const foo = "\\xb1"'
]);
