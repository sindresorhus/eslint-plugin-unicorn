import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/regex-shorthand';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const error = {
	ruleId: 'regex-shorthand',
	message: 'Use regex shorthands to improve readability.'
};

ruleTester.run('regex-shorthand', rule, {
	valid: [
		'const foo = /\\d/',
		'const foo = /\\W/i',
		'const foo = /\\w/ig',
		'const foo = /[a-z]/ig',
		'const foo = /\\d*?/ig',
		'const foo = /[a-z0-9_]/',
		`const foo = new RegExp('\\d')`,
		`const foo = new RegExp('\\d', 'ig')`,
		`const foo = new RegExp('\\d*?')`,
		`const foo = new RegExp('[a-z]', 'i')`,
		`const foo = new RegExp(/\\d/)`,
		`const foo = new RegExp(/\\d/ig)`,
		`const foo = new RegExp(/\\d/, 'ig')`,
		`const foo = new RegExp(/\\d*?/)`,
		`const foo = new RegExp(/[a-z]/, 'i')`,
		`const foo = new RegExp(/^[^*]*[*]?$/)`
	],
	invalid: [
		{
			code: 'const foo = /[0-9]/',
			errors: [error],
			output: 'const foo = /\\d/'
		},
		{
			code: `const foo = new RegExp('[0-9]')`,
			errors: [error],
			output: `const foo = new RegExp('\\d')`
		},
		{
			code: 'const foo = /[0-9]/ig',
			errors: [error],
			output: 'const foo = /\\d/ig'
		},
		{
			code: `const foo = new RegExp('[0-9]', 'ig')`,
			errors: [error],
			output: `const foo = new RegExp('\\d', 'ig')`
		},
		{
			code: 'const foo = /[^0-9]/',
			errors: [error],
			output: 'const foo = /\\D/'
		},
		{
			code: 'const foo = /[A-Za-z0-9_]/',
			errors: [error],
			output: 'const foo = /\\w/'
		},
		{
			code: 'const foo = /[A-Za-z\\d_]/',
			errors: [error],
			output: 'const foo = /\\w/'
		},
		{
			code: 'const foo = /[a-zA-Z0-9_]/',
			errors: [error],
			output: 'const foo = /\\w/'
		},
		{
			code: 'const foo = /[a-zA-Z\\d_]/',
			errors: [error],
			output: 'const foo = /\\w/'
		},
		{
			code: 'const foo = /[A-Za-z0-9_]+[0-9]?\\.[A-Za-z0-9_]*/',
			errors: [error],
			output: 'const foo = /\\w+\\d?\\.\\w*/'
		},
		{
			code: 'const foo = /[a-z0-9_]/i',
			errors: [error],
			output: 'const foo = /\\w/i'
		},
		{
			code: 'const foo = /[a-z\\d_]/i',
			errors: [error],
			output: 'const foo = /\\w/i'
		},
		{
			code: 'const foo = /[^A-Za-z0-9_]/',
			errors: [error],
			output: 'const foo = /\\W/'
		},
		{
			code: 'const foo = /[^A-Za-z\\d_]/',
			errors: [error],
			output: 'const foo = /\\W/'
		},
		{
			code: 'const foo = /[^a-z0-9_]/i',
			errors: [error],
			output: 'const foo = /\\W/i'
		},
		{
			code: 'const foo = /[^a-z\\d_]/i',
			errors: [error],
			output: 'const foo = /\\W/i'
		},
		{
			code: 'const foo = /[^a-z\\d_]/ig',
			errors: [error],
			output: 'const foo = /\\W/ig'
		},
		{
			code: 'const foo = /[^\\d_a-z]/ig',
			errors: [error],
			output: 'const foo = /\\W/ig'
		},
		{
			code: `const foo = new RegExp(/[0-9]/)`,
			errors: [error],
			output: `const foo = new RegExp(/\\d/)`
		},
		{
			code: `const foo = new RegExp(/[0-9]/, 'ig')`,
			errors: [error],
			output: `const foo = new RegExp(/\\d/, 'ig')`
		},
		{
			code: `const foo = new RegExp(/[0-9]/)`,
			errors: [error],
			output: `const foo = new RegExp(/\\d/)`
		},
		{
			code: `const foo = new RegExp(/[0-9]/, 'ig')`,
			errors: [error],
			output: `const foo = new RegExp(/\\d/, 'ig')`
		}
	]
});
