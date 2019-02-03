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

ruleTester.run('no-unnecessary-polyfills', rule, {
	valid: [
		{
			code: 'require("object-assign")',
			options: [{targetVersion: '0.10'}]
		}
	],
	invalid: [
		{
			code: 'require("object-assign")',
			options: [{targetVersion: '6'}],
			errors: [{message: 'Use built in object.assign'}]
		},
		{
			code: 'import assign from "object-assign"',
			options: [{targetVersion: '6'}],
			errors: [{message: 'Use built in object.assign'}]
		},
		{
			code: 'require("array-from")',
			options: [{targetVersion: '6'}],
			errors: [{message: 'Use built in array.from'}]
		}
	]
});
