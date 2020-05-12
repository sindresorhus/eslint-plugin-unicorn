import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-reduce';
import {outdent} from 'outdent';

const messageId = 'no-reduce';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

const errors = [{messageId}];

const tests = {
	valid: [
		'a[b.reduce]()',
		'a(b.reduce)',
		'a.reduce()',
		'a.reduce(1, 2, 3)',
		'a.reduce(b, c, d)',
		'[][reduce].call()',
		'[1, 2].reduce.call(() => {}, 34)',
		'a.reduce(123)',
		'a.reduce()',
		'a.reduce(undefined)',
		'a.reduce(\'abc\')',

		// Test `.reduce`
		// Not `CallExpression`
		'new foo.reduce(fn);',
		// Not `MemberExpression`
		'reduce(fn);',
		// `callee.property` is not a `Identifier`
		'foo["reduce"](fn);',
		// Computed
		'foo[reduce](fn);',
		// Not listed method
		'foo.notListedMethod(fn);',
		// More or less argument(s)
		'foo.reduce();',
		'foo.reduce(fn, extraArgument1, extraArgument2);',
		'foo.reduce(...argumentsArray)',

		// Test `[].reduce.{call,apply}`
		// Not `CallExpression`
		'new [].reduce.call(foo, fn);',
		// Not `MemberExpression`
		'call(foo, fn);',
		'reduce.call(foo, fn);',
		// `callee.property` is not a `Identifier`
		'[].reduce["call"](foo, fn);',
		'[]["reduce"].call(foo, fn);',
		// Computed
		'[].reduce[call](foo, fn);',
		'[][reduce].call(foo, fn);',
		// Not listed method
		'[].reduce.notListedMethod(foo, fn);',
		'[].notListedMethod.call(foo, fn);',
		// Not empty
		'[1].reduce.call(foo, fn)',
		// Not ArrayExpression
		'"".reduce.call(foo, fn)',
		// More or less argument(s)
		// We are not checking arguments length

		'new Array.prototype.reduceRight.call(foo, fn);',
		'call(foo, fn);',
		'reduceRight.call(foo, fn);',
		'Array.prototype.reduceRight["call"](foo, fn);',
		'Array.prototype["reduceRight"].call(foo, fn);',
		'Array["prototype"].reduceRight.call(foo, fn);',
		'"Array".prototype.reduceRight.call(foo, fn);',
		'Array.prototype.reduceRight[call](foo, fn);',
		'Array.prototype[reduceRight].call(foo, fn);',
		'Array[prototype].reduceRight.call(foo, fn);',
		'Array.prototype.reduceRight.notListedMethod(foo, fn);',
		'Array.prototype.notListedMethod.call(foo, fn);',
		'Array.notListedMethod.reduceRight.call(foo, fn);',
		'NotArray.prototype.reduceRight.call(foo, fn);',
		'a[b.reduceRight]()',
		'a(b.reduceRight)',
		'a.reduceRight()',
		'a.reduceRight(1, 2, 3)',
		'a.reduceRight(b, c, d)',
		'[][reduceRight].call()',
		'[1, 2].reduceRight.call(() => {}, 34)',
		'a.reduceRight(123)',
		'a.reduceRight()',
		'a.reduceRight(undefined)',
		'a.reduceRight(\'abc\')',

		'new foo.reduceRight(fn);',
		'reduceRight(fn);',
		'foo["reduceRight"](fn);',
		'foo[reduceRight](fn);',
		'foo.notListedMethod(fn);',
		'foo.reduceRight();',
		'foo.reduceRight(fn, extraArgument1, extraArgument2);',
		'foo.reduceRight(...argumentsArray)',

		'new [].reduceRight.call(foo, fn);',
		'call(foo, fn);',
		'reduceRight.call(foo, fn);',
		'[].reduceRight["call"](foo, fn);',
		'[]["reduceRight"].call(foo, fn);',
		'[].reduceRight[call](foo, fn);',
		'[][reduceRight].call(foo, fn);',
		'[].reduceRight.notListedMethod(foo, fn);',
		'[].notListedMethod.call(foo, fn);',
		'[1].reduceRight.call(foo, fn)',
		'"".reduceRight.call(foo, fn)',

		'new Array.prototype.reduceRight.call(foo, fn);',
		'call(foo, fn);',
		'reduceRight.call(foo, fn);',
		'Array.prototype.reduceRight["call"](foo, fn);',
		'Array.prototype["reduceRight"].call(foo, fn);',
		'Array["prototype"].reduceRight.call(foo, fn);',
		'"Array".prototype.reduceRight.call(foo, fn);',
		'Array.prototype.reduceRight[call](foo, fn);',
		'Array.prototype[reduceRight].call(foo, fn);',
		'Array[prototype].reduceRight.call(foo, fn);',
		'Array.prototype.reduceRight.notListedMethod(foo, fn);',
		'Array.prototype.notListedMethod.call(foo, fn);',
		'Array.notListedMethod.reduceRight.call(foo, fn);',
		'NotArray.prototype.reduceRight.call(foo, fn);'
	],
	invalid: [
		'arr.reduce((total, item) => total + item)',
		'arr.reduce((total, item) => total + item, 0)',
		'arr.reduce(function (total, item) { return total + item }, 0)',
		'arr.reduce(function (total, item) { return total + item })',
		'arr.reduce((str, item) => str += item, "")',
		outdent`
			arr.reduce((obj, item) => {
				obj[item] = null;
				return obj;
			}, {})
		`,
		'arr.reduce((obj, item) => ({ [item]: null }), {})',
		outdent`
			const hyphenate = (str, char) => \`\${str}-\${char}\`;
			["a", "b", "c"].reduce(hyphenate);
		`,
		'[].reduce.call(arr, (s, i) => s + i)',
		'[].reduce.call(arr, sum);',
		'[].reduce.call(sum);',
		'Array.prototype.reduce.call(arr, (s, i) => s + i)',
		'Array.prototype.reduce.call(arr, sum);',
		'[].reduce.apply(arr, [(s, i) => s + i])',
		'[].reduce.apply(arr, [sum]);',
		'Array.prototype.reduce.apply(arr, [(s, i) => s + i])',
		'Array.prototype.reduceRight.apply(arr, [sum]);',
		'arr.reduceRight((total, item) => total + item)',
		'arr.reduceRight((total, item) => total + item, 0)',
		'arr.reduceRight(function (total, item) { return total + item }, 0)',
		'arr.reduceRight(function (total, item) { return total + item })',
		'arr.reduceRight((str, item) => str += item, "")',
		outdent`
			arr.reduceRight((obj, item) => {
				obj[item] = null;
				return obj;
			}, {})
		`,
		'arr.reduceRight((obj, item) => ({ [item]: null }), {})',
		outdent`
			const hyphenate = (str, char) => \`\${str}-\${char}\`;
			["a", "b", "c"].reduceRight(hyphenate);
		`,
		'[].reduceRight.call(arr, (s, i) => s + i)',
		'[].reduceRight.call(arr, sum);',
		'[].reduceRight.call(sum);',
		'Array.prototype.reduceRight.call(arr, (s, i) => s + i)',
		'Array.prototype.reduceRight.call(arr, sum);',
		'[].reduceRight.apply(arr, [(s, i) => s + i])',
		'[].reduceRight.apply(arr, [sum]);',
		'Array.prototype.reduceRight.apply(arr, [(s, i) => s + i])',
		'Array.prototype.reduceRight.apply(arr, [sum]);'
	].map(code => ({code, errors}))
};

ruleTester.run('no-reduce', rule, tests);
