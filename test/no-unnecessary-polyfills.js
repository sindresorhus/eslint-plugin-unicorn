import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		{
			code: 'require("object-assign")',
			options: [{targets: {node: '0.1.0'}}],
		},
		{
			code: 'require("this-is-not-a-polyfill")',
			options: [{targets: {node: '0.1.0'}}],
		},
		{
			code: 'import assign from "object-assign"',
			options: [{targets: {node: '0.1.0'}}],
		},
		{
			code: 'import("object-assign")',
			options: [{targets: {node: '0.1.0'}}],
		},
		{
			code: 'require("object-assign")',
			options: [{targets: 'node <4'}],
		},
		{
			code: 'require("object-assign")',
			options: [{targets: 'node >3'}],
		},
		{
			code: 'require()',
			options: [{targets: 'node >3'}],
		},
		{
			code: 'import("")',
			options: [{targets: 'node >3'}],
		},
		{
			code: 'import(null)',
			options: [{targets: 'node >3'}],
		},
		{
			code: 'require(null)',
			options: [{targets: 'node >3'}],
		},
		{
			code: 'require("" )',
			options: [{targets: 'node >3'}],
		},
		'import ExtendableError from "es6-error"',
	],
	invalid: [
		{
			code: 'require("setprototypeof")',
			options: [{targets: 'node >4'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("core-js/features/array/last-index-of")',
			options: [{targets: 'node >6.5'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("core-js-pure/features/array/from")',
			options: [{targets: 'node >7'}],
			errors: [{message: 'All polyfilled features imported from `core-js-pure/features/array/from` are available as built-ins. Use the built-ins instead.'}],
		},
		{
			code: 'require("core-js/features/array/from")',
			options: [{targets: 'node >7'}],
			errors: [{message: 'All polyfilled features imported from `core-js/features/array/from` are available as built-ins. Use the built-ins instead.'}],
		},
		{
			code: 'require("core-js/features/typed-array")',
			options: [{targets: 'node >16'}],
			errors: [{message: 'All polyfilled features imported from `core-js/features/typed-array` are available as built-ins. Use the built-ins instead.'}],
		},
		{
			code: 'require("es6-symbol")',
			options: [{targets: 'node >15'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("code-point-at")',
			options: [{targets: 'node >4'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("object.getownpropertydescriptors")',
			options: [{targets: 'node >8'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("string.prototype.padstart")',
			options: [{targets: 'node >8'}],
			errors: [{message: 'Use built-in instead.'}],

		},
		{
			code: 'require("p-finally")',
			options: [{targets: 'node >10.4'}],
			errors: [{message: 'Use built-in instead.'}],

		},
		{
			code: 'require("promise-polyfill")',
			options: [{targets: 'node >15'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("es6-promise")',
			options: [{targets: 'node >15'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("object-assign")',
			options: [{targets: 'node 6'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'import assign from "object-assign"',
			options: [{targets: 'node 6'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'import("object-assign")',
			options: [{targets: 'node 6'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("object-assign")',
			options: [{targets: 'node >6'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("object-assign")',
			options: [{targets: 'node 8'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("array-from")',
			options: [{targets: 'node >7'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("array-find-index")',
			options: [{targets: 'node >4.0.0'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("array-find-index")',
			options: [{targets: 'node >4'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("array-find-index")',
			options: [{targets: 'node 4'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("mdn-polyfills/Array.prototype.findIndex")',
			options: [{targets: 'node 4'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("weakmap-polyfill")',
			options: [{targets: 'node 12'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("typed-array-float64-array-polyfill")',
			options: [{targets: 'node 17'}],
			errors: [{message: 'Use built-in instead.'}],
		},
	],
});
