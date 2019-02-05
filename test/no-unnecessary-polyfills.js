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
			options: [{targetVersion: '0.1.0'}]
		},
		{
			code: 'import assign from "object-assign"',
			options: [{targetVersion: '0.1.0'}]
		},
		{
			code: 'require("object-assign")',
			options: [{targetVersion: '<4'}]
		},
		{
			code: 'require("object-assign")',
			options: [{targetVersion: '>3'}]
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
			code: 'require("object-assign")',
			options: [{targetVersion: '>6'}],
			errors: [{message: 'Use built in object.assign'}]
		},
		{
			code: 'require("object-assign")',
			options: [{targetVersion: '8'}],
			errors: [{message: 'Use built in object.assign'}]
		},
		{
			code: 'require("array-from")',
			options: [{targetVersion: '>7 <8'}],
			errors: [{message: 'Use built in array.from'}]
		},
		{
			code: 'require("array.prototype.every")',
			options: [{targetVersion: '~4.0.0'}],
			errors: [{message: 'Use built in array.every'}]
		},
		{
			code: 'require("array-find-index")',
			options: [{targetVersion: '>4.0.0'}],
			errors: [{message: 'Use built in array.find-index'}]
		},
		{
			code: 'require("array-find-index")',
			options: [{targetVersion: '>4'}],
			errors: [{message: 'Use built in array.find-index'}]
		},
		{
			code: 'require("array-find-index")',
			options: [{targetVersion: '>=4 <5.2 || >6.0.0'}],
			errors: [{message: 'Use built in array.find-index'}]
		},
		{
			code: 'require("array-find-index")',
			options: [{targetVersion: '4'}],
			errors: [{message: 'Use built in array.find-index'}]
		}
	]
});
