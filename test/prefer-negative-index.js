import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-negative-index';
import {outdent} from 'outdent';

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
		// Docs example (1)
		'foo.slice(-2, -1)',
		// Docs example (2)
		'foo.splice(-1, 1)',
		'foo.slice(bar.length - 1)',
		'foo.slice(foo.length - 2 + 1)',
		'foo.slice(foo.length - 0)',
		'foo.slice(foo.length - (-1))',
		'foo.slice(foo.length + 1)',
		'[1, 2, 3].slice([1, 2, 3].length + 1)',
		'[1, 2, 3].slice([1, 2, 3].length + 1)',
		'foo.bar.slice(foo["bar"].length - 1)',
		'foo[`bar`].slice(foo["bar"].length - 1)',
		'foo[1].slice(foo["1"].length - 1)',
		'foo.slice((foo.length - 1) + 1)',
		'foo.slice(foo.length - 1 / 1)',
		// foo[bar++]
		'foo[bar++].slice(foo[bar++].length - 1)',
		// foo['bar'] & foo["bar"]
		'foo[\'bar\'].slice(foo["bar"].length - 1)'
	],
	invalid: [
		// Docs example (1)
		{
			code: 'foo.slice(foo.length - 2, foo.length - 1)',
			errors: [error],
			output: 'foo.slice( - 2,  - 1)'
		},
		// Docs example (2)
		{
			code: 'foo.splice(foo.length - 1, 1);',
			errors: [error],
			output: 'foo.splice( - 1, 1);'
		},
		// nested
		{
			code: 'foo.slice(foo.length - 1 - 1)',
			errors: [error],
			output: 'foo.slice( - 1 - 1)'
		},
		// foo.bar
		{
			code: 'foo.bar.slice(foo.bar.length - 1)',
			errors: [error],
			output: 'foo.bar.slice( - 1)'
		},
		// foo['bar']
		{
			code: 'foo[\'bar\'].slice(foo[\'bar\'].length - 1)',
			errors: [error],
			output: 'foo[\'bar\'].slice( - 1)'
		},
		// foo[1]
		{
			code: 'foo[1].slice(foo[1].length - 1)',
			errors: [error],
			output: 'foo[1].slice( - 1)'
		},
		// foo[`${bar}`]
		{
			code: 'foo[`${bar}`].slice(foo[`${bar}`].length - 1)',
			errors: [error],
			output: 'foo[`${bar}`].slice( - 1)'
		},
		// foo[a + b]
		{
			code: 'foo[a + b].slice(foo[a + b].length - 1)',
			errors: [error],
			output: 'foo[a + b].slice( - 1)'
		},
		// comment
		{
			code: 'foo.slice(foo.length/* comment */ - 1)',
			errors: [error],
			output: 'foo.slice(/* comment */ - 1)'
		},
		// comment
		{
			code: outdent`
				foo.slice(
					// comment 1
					foo.length
					- 1
					-1
					,
					foo.length // comment 2
					- 1
				)
			`,
			errors: [error],
			output: (outdent`
				foo.slice(
					// comment 1
					<PLACEHOLDER_TO_KEEP_TAB>
					- 1
					-1
					,
					 // comment 2
					- 1
				)
			`).replace('<PLACEHOLDER_TO_KEEP_TAB>', ''),
		},
		// parentheses
		// {
		// 	code: 'foo.slice(((foo.length) - 1) - 1)',
		// 	errors: [error],
		// 	output: 'foo.slice(( - 1) - 1)'
		// },
	]
});
