import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/escape-case';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [{
	ruleId: 'escape-case',
	message: 'Use uppercase characters for escape sequences'
}];

ruleTester.run('escape-case', rule, {
	valid: [
		'var foo = "\\xA9"',
		'var foo = "\\uD834"',
		'var foo = "\\u{1D306}"',
		'var foo = "\\cA"'
	],
	invalid: [
		{
			code: 'var foo = "\\xa9"',
			errors
		},
		{
			code: 'var foo = "\\ud834"',
			errors
		},
		{
			code: 'var foo = "\\u{1d306}"',
			errors
		},
		{
			code: 'var foo = "\\ca"',
			errors
		}
	]
});
