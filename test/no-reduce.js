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
		'a.b.call.reduce(() => {})',
		'a.call.reduce(() => {})',
		'[][reduce].call()',
		'[1, 2].call.reduce(() => {})',
		'[1, 2].reduce.call(() => {}, 34)',

		// Test `.reduce`
		// Not `CallExpression`
		'new foo.reduce(fn);',
		// Not `MemberExpression`
		'reduce(fn);',
		// `callee.property` is not a `Identifier`
		'foo[\'reduce\'](fn);',
		// Computed
		'foo[reduce](fn);',
		// Not listed method
		'foo.notListedMethod(fn);',
		// More or less argument(s)
		'foo.reduce();',
		'foo.reduce(fn, extraArgument1, extraArgument2);',
		'foo.reduce(...argumentsArray)'
	],
	invalid: [
		'arr.reduce((total, item) => total + item)',
		'arr.reduce((total, item) => total + item, 0)',
		'arr.reduce(function (total, item) { return total + item }, 0)',
		'arr.reduce(function (total, item) { return total + item })',
		'arr.reduce((str, item) => str += item, \'\')',
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
		'Array.prototype.reduce.apply(arr, [sum]);'
	].map(code => ({code, errors}))
};

ruleTester.run('no-reduce', rule, tests);
