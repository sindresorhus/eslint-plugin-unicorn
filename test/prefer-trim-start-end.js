import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-trim-start-end';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

ruleTester.run('prefer-trim-start-end', rule, {
	valid: [
		'foo.trimStart()',
		'foo.trimEnd()',
		// Not `CallExpression`
		'new foo.trimLeft();',
		// Not `MemberExpression`
		'trimLeft();',
		// `callee.property` is not a `Identifier`
		'foo[\'trimLeft\']();',
		// Computed
		'foo[trimLeft]();',
		// Not `trimLeft`/`trimRight`
		'foo.bar();',
		// More argument(s)
		'foo.trimLeft(extra);',
		'foo.trimLeft(...argumentsArray)'
	],
	invalid: [
		{
			code: 'foo.trimLeft()',
			output: 'foo.trimStart()',
			errors: ['Prefer `String#trimStart()` over `String#trimLeft()`.']
		},
		{
			code: 'foo.trimRight()',
			output: 'foo.trimEnd()',
			errors: ['Prefer `String#trimEnd()` over `String#trimRight()`.']
		}
	]
});
