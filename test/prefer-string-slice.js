import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/prefer-string-slice';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [{
	ruleId: 'prefer-string-slice'
}];

ruleTester.run('prefer-string-slice', rule, {
	valid: [
		'const substr = foo.substr',
		'const substring = foo.substring',

		'foo.slice()',
		'foo.slice(0)',
		'foo.slice(1, 2)',
		'foo.slice(-3, -2)'
	],

	invalid: [
		{
			code: 'foo.substr()',
			output: 'foo.slice()',
			errors
		},
		{
			code: '"foo".substr()',
			output: '"foo".slice()',
			errors
		},
		{
			code: '"foo".substr(1)',
			output: '"foo".slice(1)',
			errors
		},
		{
			code: '"foo".substr(1, 2)',
			output: '"foo".slice(1, 1 + 2)',
			errors
		},
		{
			code: outdent`
				const length = 123;
				"foo".substr(1, length)
			`,
			output: outdent`
				const length = 123;
				"foo".slice(1, 1 + length)
			`,
			errors
		},
		{
			code: outdent`
				const length = 123;
				"foo".substr(0, length)
			`,
			output: outdent`
				const length = 123;
				"foo".slice(0, length)
			`,
			errors
		},
		{
			code: outdent`
				const length = 123;
				"foo".substr(1, length - 4)
			`,
			output: outdent`
				const length = 123;
				"foo".slice(1, 1 + length - 4)
			`,
			errors
		},
		{
			code: outdent`
				const uri = 'foo';
				(uri || '').substr(1)
			`,
			output: outdent`
				const uri = 'foo';
				(uri || '').slice(1)
			`,
			errors
		},

		{
			code: 'foo.substr(start)',
			errors
		},
		{
			code: '"foo".substr(1)',
			errors
		},
		{
			code: 'foo.substr(start, length)',
			errors
		},
		{
			code: '"foo".substr(1, 2)',
			errors
		},

		{
			code: 'foo.substring()',
			output: 'foo.slice()',
			errors
		},
		{
			code: '"foo".substring()',
			output: '"foo".slice()',
			errors
		},
		{
			code: '"foo".substring(1)',
			output: '"foo".slice(1)',
			errors
		},
		{
			code: '"foo".substring(1, 2)',
			output: '"foo".slice(1, 2)',
			errors
		},

		{
			code: 'foo.substring(start)',
			errors
		},
		{
			code: '"foo".substring(1)',
			errors
		},
		{
			code: 'foo.substring(start, end)',
			errors
		},
		{
			code: '"foo".substring(1, 3)',
			errors
		}
	]
});
