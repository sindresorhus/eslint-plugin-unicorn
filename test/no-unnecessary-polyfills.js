import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		{
			code: 'require("object-assign")',
			options: [{targets: {node: '0.1.0'}}],
		},
		// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2584
		{
			code: 'import regexpEscape from "regexp.escape"',
			options: [{targets: {node: '18'}}],
		},
		{
			code: 'require("core-js/full/regexp/escape")',
			options: [{targets: {node: '18'}}],
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
		{
			code: 'import "core-js/stable"',
			options: [{targets: ['>0.2%', 'iOS 14', 'not dead', 'not op_mini all']}],
		},
		// Multi-feature imports where some features are still unavailable
		{
			code: 'require("core-js/features/typed-array")',
			options: [{targets: 'node >16'}],
		},
		{
			code: 'require("core-js/stable/promise")',
			options: [{targets: 'node >15'}],
		},
		{
			code: 'import "core-js/stable"',
			options: [{targets: 'node >20'}],
		},
		{
			code: 'require("core-js-pure/stable/symbol")',
			options: [{targets: 'node >15'}],
		},
		// Alias polyfill whose mapped `core-js/full` entry still includes unavailable features
		{
			code: 'require("typed-array-float64-array-polyfill")',
			options: [{targets: 'node 17'}],
		},
		// `esnext` feature still needed (not yet graduated)
		{
			code: 'require("core-js/features/regexp/escape")',
			options: [{targets: {node: '18'}}],
		},
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
		// Multi-feature imports where all features are available
		{
			code: 'require("core-js/features/array/flat")',
			options: [{targets: 'node >16'}],
			errors: [{message: 'All polyfilled features imported from `core-js/features/array/flat` are available as built-ins. Use the built-ins instead.'}],
		},
		{
			code: 'require("core-js/stable/promise")',
			options: [{targets: 'node >24'}],
			errors: [{message: 'All polyfilled features imported from `core-js/stable/promise` are available as built-ins. Use the built-ins instead.'}],
		},
		{
			code: 'import "core-js-pure/stable/array/flat"',
			options: [{targets: 'node >16'}],
			errors: [{message: 'All polyfilled features imported from `core-js-pure/stable/array/flat` are available as built-ins. Use the built-ins instead.'}],
		},
		// `esnext` feature that graduated to `es` (both available)
		{
			code: 'require("core-js/features/regexp/escape")',
			options: [{targets: {node: '24'}}],
			errors: [{message: 'All polyfilled features imported from `core-js/features/regexp/escape` are available as built-ins. Use the built-ins instead.'}],
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
			code: 'require("promiseall-settled-polyfill")',
			options: [{targets: {node: '20'}}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("es6-promise")',
			options: [{targets: 'node >15'}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("es.prototype.array.find")',
			options: [{targets: {node: '20'}}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("polyfill-es.prototype.array.find")',
			options: [{targets: {node: '20'}}],
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
			code: 'require("arrayevery-polyfill")',
			options: [{targets: {node: '20'}}],
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
		// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2584
		{
			code: 'import regexpEscape from "regexp.escape"',
			options: [{targets: {node: '24'}}],
			errors: [{message: 'Use built-in instead.'}],
		},
		{
			code: 'require("core-js/full/regexp/escape")',
			options: [{targets: {node: '24'}}],
			errors: [{message: 'All polyfilled features imported from `core-js/full/regexp/escape` are available as built-ins. Use the built-ins instead.'}],
		},
	],
});
