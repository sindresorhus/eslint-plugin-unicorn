import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-includes';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [{
	ruleId: 'prefer-includes',
	message: 'Use `.includes()`, not .indexOf(), when checking for existence.'
}];

ruleTester.run('prefer-includes', rule, {
	valid: [
		'str.indexOf(\'foo\') !== -n',
		'str.indexOf(\'foo\') !== 1',
		'!str.indexOf(\'foo\') === 1',
		'!str.indexOf(\'foo\') === -n',
		'str.includes(\'foo\')',
		'\'foobar\'.includes(\'foo\')',
		'[1,2,3].includes(4)',
		'"str.indexOf(\'foo\') !== -1"'
	],
	invalid: [
		{
			code: '\'foobar\'.indexOf(\'foo\') !== -1',
			output: '\'foobar\'.includes(\'foo\')',
			errors
		},
		{
			code: 'str.indexOf(\'foo\') != -1',
			output: 'str.includes(\'foo\')',
			errors
		},
		{
			code: 'str.indexOf(\'foo\') > -1',
			output: 'str.includes(\'foo\')',
			errors
		},
		{
			code: '\'foobar\'.indexOf(\'foo\') >= 0',
			output: '\'foobar\'.includes(\'foo\')',
			errors
		},
		{
			code: '!str.indexOf(\'foo\') === -1',
			output: 'str.includes(\'foo\')',
			errors
		},
		{
			code: '!str.indexOf(\'foo\') == -1',
			output: 'str.includes(\'foo\')',
			errors
		},
		{
			code: '!\'foobar\'.indexOf(\'foo\') < 0',
			output: '\'foobar\'.includes(\'foo\')',
			errors
		},
		{
			code: '[1,2,3].indexOf(4) !== -1',
			output: '[1,2,3].includes(4)',
			errors
		}
	]
});
