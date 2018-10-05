import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-unreadable-array-destructuring';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

ruleTester.run('no-unreadable-array-destructuring', rule, {
	valid: [
		'const [, foo] = parts;',
		'const [foo] = parts;',
		'const [foo,,bar] = parts;',
		'const [foo,   ,     bar] = parts;',
		'const [foo,] = parts;',
		'const [foo,,] = parts;',
		'const [foo,, bar,, baz] = parts;'
	],
	invalid: [
		{
			code: 'const [,, foo] = parts;',
			errors: [{message: 'Only one ignored value in series allowed in array destructuring.'}]
		},
		{
			code: 'const [foo,,, bar] = parts;',
			errors: [{message: 'Only one ignored value in series allowed in array destructuring.'}]
		},
		{
			code: 'const [foo,,,] = parts;',
			errors: [{message: 'Only one ignored value in series allowed in array destructuring.'}]
		},
		{
			code: 'const [foo, bar,, baz ,,, qux] = parts;',
			errors: [{message: 'Only one ignored value in series allowed in array destructuring.'}]
		}
	]
});
