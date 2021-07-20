import outdent from 'outdent';
import notFunctionTypes from './utils/not-function-types.mjs';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const errorsReduce = [{messageId: 'no-reduce', data: {method: 'reduce'}}];
const errorsReduceRight = [{messageId: 'no-reduce', data: {method: 'reduceRight'}}];

test({
	valid: [
		'a[b.reduce]()',
		'a(b.reduce)',
		'a.reduce()',
		'a.reduce(1, 2, 3)',
		'a.reduce(b, c, d)',
		'[][reduce].call()',
		'[1, 2].reduce.call(() => {}, 34)',

		// First argument is not a function
		...notFunctionTypes.map(data => `foo.reduce(${data})`),

		// Test `.reduce`
		// Not `CallExpression`
		'new foo.reduce(fn);',
		// Not `MemberExpression`
		'reduce(fn);',
		// `callee.property` is not a `Identifier`
		'foo["reduce"](fn);',
		// Computed
		'foo[reduce](fn);',
		// Not listed method or property
		'foo.notListed(fn);',
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
		// Not listed method or property
		'[].reduce.notListed(foo, fn);',
		'[].notListed.call(foo, fn);',
		// Not empty
		'[1].reduce.call(foo, fn)',
		// Not ArrayExpression
		'"".reduce.call(foo, fn)',
		// More or less argument(s)
		// We are not checking arguments length

		// Test `Array.prototype.{call,apply}`
		// Not `CallExpression`
		'new Array.prototype.reduce.call(foo, fn);',
		// Not `MemberExpression`
		'call(foo, fn);',
		'reduce.call(foo, fn);',
		// `callee.property` is not a `Identifier`
		'Array.prototype.reduce["call"](foo, fn);',
		'Array.prototype["reduce"].call(foo, fn);',
		'Array["prototype"].reduce.call(foo, fn);',
		'"Array".prototype.reduce.call(foo, fn);',
		// Computed
		'Array.prototype.reduce[call](foo, fn);',
		'Array.prototype[reduce].call(foo, fn);',
		'Array[prototype].reduce.call(foo, fn);',
		// Not listed method
		'Array.prototype.reduce.notListed(foo, fn);',
		'Array.prototype.notListed.call(foo, fn);',
		'Array.notListed.reduce.call(foo, fn);',
		// Not `Array`
		'NotArray.prototype.reduce.call(foo, fn);',
		// More or less argument(s)
		// We are not checking arguments length

		// `reduce-like`
		'arr.reducex(foo)',
		'arr.xreduce(foo)',
		'[].reducex.call(arr, foo)',
		'[].xreduce.call(arr, foo)',
		'Array.prototype.reducex.call(arr, foo)',
		'Array.prototype.xreduce.call(arr, foo)',

		// Second argument is not a function
		...notFunctionTypes.map(data => `Array.prototype.reduce.call(foo, ${data})`),

		// Option: allowSimpleOperations
		'arr.reduce((total, item) => total + item)',
		'arr.reduce((total, item) => { return total - item })',
		'arr.reduce(function (total, item) { return total * item })',
		'arr.reduce((total, item) => total + item, 0)',
		'arr.reduce((total, item) => { return total - item }, 0 )',
		'arr.reduce(function (total, item) { return total * item }, 0)',
		outdent`
			arr.reduce((total, item) => {
				const multiplier = 100;
				return (total / item) * multiplier;
			}, 0)
		`,
		'arr.reduce((total, item) => { return total + item }, 0)',
	].flatMap(testCase => [testCase, testCase.replace('reduce', 'reduceRight')]),
	invalid: [
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
		'Array.prototype.reduce.apply(arr, [sum]);',

		// Option: allowSimpleOperations
		{
			code: 'arr.reduce((total, item) => total + item)',
			options: [{allowSimpleOperations: false}],
		},
		{
			code: 'arr.reduce((total, item) => { return total - item })',
			options: [{allowSimpleOperations: false}],
		},
		{
			code: 'arr.reduce(function (total, item) { return total * item })',
			options: [{allowSimpleOperations: false}],
		},
		{
			code: 'arr.reduce((total, item) => total + item, 0)',
			options: [{allowSimpleOperations: false}],
		},
		{
			code: 'arr.reduce((total, item) => { return total - item }, 0 )',
			options: [{allowSimpleOperations: false}],
		},
		{
			code: 'arr.reduce(function (total, item) { return total * item }, 0)',
			options: [{allowSimpleOperations: false}],
		},
		{
			code: outdent`
				arr.reduce((total, item) => {
					const multiplier = 100;
					return (total / item) * multiplier;
				}, 0)
			`,
			options: [{allowSimpleOperations: false}],
		},
	].flatMap(testCase => {
		const {code, options} = testCase;

		if (options) {
			return [
				{code, errors: errorsReduce, options},
				{code: code.replace('reduce', 'reduceRight'), errors: errorsReduceRight, options},
			];
		}

		return [
			{code: testCase, errors: errorsReduce},
			{code: testCase.replace('reduce', 'reduceRight'), errors: errorsReduceRight},
		];
	}),
});
