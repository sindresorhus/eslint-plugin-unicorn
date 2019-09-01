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
			code: 'require("setprototypeof")',
			options: [{targetVersion: '>4'}],
			errors: [{message: 'Use the built-in `Object#setPrototypeOf`.'}]
		},{
			code: 'require("core-js-pure/features/array/from")',
			options: [{targetVersion: '>7 <8'}],
			errors: [{message: 'Use the built-in `Array#from`.'}]
		},
		{
			code: 'require("core-js/features/array/from")',
			options: [{targetVersion: '>7 <8'}],
			errors: [{message: 'Use the built-in `Array#from`.'}]
		},
		{
			code: 'require("es6-symbol")',
			options: [{targetVersion: '>7'}],
			errors: [{message: 'Use the built-in `Symbol`.'}]
		},
		{
			code: 'require("code-point-at")',
			options: [{targetVersion: '>4'}],
			errors: [{message: 'Use the built-in `String#codePointAt`.'}]
		},
	/*	{
			code: 'require("util.promisify")',
			options: [{targetVersion: '>5'}]
		},*/
		{
			code: 'require("object.getownpropertydescriptors")',
			options: [{targetVersion: '>8'}],
			errors: [{message: 'Use the built-in `Object#getOwnPropertyDescriptors`.'}]
		},
		/*{
			code: 'require("object.fromentries")',
			options: [{targetVersion: '>=12'}],
			errors: [{message: 'Use the built-in `Object#fromEntries`.'}]
		},*/
		{
			code: 'require("string.prototype.padstart")',
			options: [{targetVersion: '>8'}],
			errors: [{message: 'Use the built-in `String#padStart`.'}]

		},
		{
			code: 'require("p-finally")',
			options: [{targetVersion: '>10'}],
			errors: [{message: 'Use the built-in `Promise#finally`.'}]

		},
		{
			code: 'require("promise-polyfill")',
			options: [{targetVersion: '>7'}],
			errors: [{message: 'Use the built-in `Promise`.'}]
		},
		{
			code: 'require("es6-promise")',
			options: [{targetVersion: '>7'}],
			errors: [{message: 'Use the built-in `Promise`.'}]
		},
		{
			code: 'require("object-assign")',
			options: [{targetVersion: '6'}],
			errors: [{message: 'Use the built-in `Object#assign`.'}]
		},
		{
			code: 'import assign from "object-assign"',
			options: [{targetVersion: '6'}],
			errors: [{message: 'Use the built-in `Object#assign`.'}]
		},
		{
			code: 'require("object-assign")',
			options: [{targetVersion: '>6'}],
			errors: [{message: 'Use the built-in `Object#assign`.'}]
		},
		{
			code: 'require("object-assign")',
			options: [{targetVersion: '8'}],
			errors: [{message: 'Use the built-in `Object#assign`.'}]
		},
		{
			code: 'require("array-from")',
			options: [{targetVersion: '>7 <8'}],
			errors: [{message: 'Use the built-in `Array#from`.'}]
		},
		{
			code: 'require("array.prototype.every")',
			options: [{targetVersion: '~4.0.0'}],
			errors: [{message: 'Use the built-in `Array#every`.'}]
		},
		{
			code: 'require("array-find-index")',
			options: [{targetVersion: '>4.0.0'}],
			errors: [{message: 'Use the built-in `Array#findIndex`.'}]
		},
		{
			code: 'require("array-find-index")',
			options: [{targetVersion: '>4'}],
			errors: [{message: 'Use the built-in `Array#findIndex`.'}]
		},
		{
			code: 'require("array-find-index")',
			options: [{targetVersion: '>=4 <5.2 || >6.0.0'}],
			errors: [{message: 'Use the built-in `Array#findIndex`.'}]
		},
		{
			code: 'require("array-find-index")',
			options: [{targetVersion: '4'}],
			errors: [{message: 'Use the built-in `Array#findIndex`.'}]
		}
	]
});
