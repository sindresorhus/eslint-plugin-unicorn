import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-negative-index';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = {
	ruleId: 'prefer-negative-index'
};

ruleTester.run('prefer-negative-index', rule, {
	valid: [
		// docs example (1)
		'foo.slice(-2, -1)',
		// docs example (2)
		'foo.splice(-1, 1)'
		'foo.slice(-(-1), -n)',
		'[1,2,3].slice([1, 2, 3].length - 2, [1, 2, 3].length - 1)',
		'foo.splice(-1, 1)',
		'foo.splice(-n, 1)',
		'foo.splice(-(-1), 1)',
		'[1,2,3].splice([1, 2, 3].length - 1, 1)',
		'foo.bar.slice(0, foo["bar"].length - 1)',
		'foo[`bar`].slice(0, foo["bar"].length - 1)',
		'foo[1].slice(1, foo["1"].length - 1)',
		'foo.slice(0, (foo.length - 1) / 1)',
		'foo.slice(0, (foo.length - 1) instanceof 1)',
		'foo.slice(0, foo.length / 1 - 1)',
		'foo.slice(0, foo.length + 1 - 1)'
	],
	invalid: [
		// docs example (1)
		{
			code: 'foo.slice(foo.length - 2, foo.length - 1)',
			errors: [error],
			output: 'foo.slice( - 2,  - 1)'
		},
		// docs example (2)
		{
			code: 'foo.splice(foo.length - 1, 1);',
			errors: [error],
			output: 'foo.splice( - 1, 1);'
		},
		{
			code: 'foo.slice(foo.length - (-1), foo.length - n)',
			errors: [error],
			output: 'foo.slice( - (-1),  - n)'
		},
		{
			code: 'foo.splice(foo.length - 1)',
			errors: [error],
			output: 'foo.splice( - 1)'
		},
		{
			code: 'foo.splice(foo.length - n)',
			errors: [error],
			output: 'foo.splice( - n)'
		},
		{
			code: 'foo.splice(foo.length - (-1))',
			errors: [error],
			output: 'foo.splice( - (-1))'
		},
		{
			code: 'foo.bar.slice(0, foo.bar.length - 1)',
			errors: [error],
			output: 'foo.bar.slice(0,  - 1)'
		},
		{
			code: 'foo[1].slice(0, foo[1].length - 1)',
			errors: [error],
			output: 'foo[1].slice(0,  - 1)'
		},
		{
			code: 'foo[\'bar\'].slice(0, foo["bar"].length - 1)',
			errors: [error],
			output: 'foo[\'bar\'].slice(0,  - 1)'
		},
		{
			code: 'foo[`bar`].slice(0, foo[`bar`].length - 1)',
			errors: [error],
			output: 'foo[`bar`].slice(0,  - 1)'
		},
		{
			code: 'foo.slice(0, foo.length - 1 - 1)',
			errors: [error],
			output: 'foo.slice(0,  - 1 - 1)'
		},
		{
			code: 'foo.slice(0, foo.length - 1 / 1)',
			errors: [error],
			output: 'foo.slice(0,  - 1 / 1)'
		},
		{
			code: 'foo.slice(0, foo.length - 1 + 1)',
			errors: [error],
			output: 'foo.slice(0,  - 1 + 1)'
		},
		{
			code: 'foo.slice(0, (foo.length - 1))',
			errors: [error],
			output: 'foo.slice(0, ( - 1))'
		},
		{
			code: 'foo.slice(0, foo.length /* comment */ - 1)',
			errors: [error],
			output: 'foo.slice(0,  /* comment */ - 1)'
		},
		{
			code: 'foo.slice(foo.length - 1).splice(foo.length - 2)',
			errors: [error],
			output: 'foo.slice( - 1).splice(foo.length - 2)'
		}
	]
});
