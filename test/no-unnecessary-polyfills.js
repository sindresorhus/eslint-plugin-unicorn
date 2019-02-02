import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-unnecessary-polyfills';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

ruleTester.run('no-unreadable-array-destructuring', rule, {
	valid: [

	],
	invalid: [
		{
			code: 'require("object-assign")',
			errors: [{message: 'Use built in object.assign'}]
		},
		{
			code: 'import assign from "object-assign"',
			errors: [{message: 'Use built in object.assign'}]
		},
		{
			code: 'require("array-from")',
			errors: [{message: 'Use built in array.from'}]
		}
	]
});
