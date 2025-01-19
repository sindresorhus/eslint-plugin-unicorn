import outdent from 'outdent';
import notFunctionTypes from './utils/not-function-types.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const errorsReduce = [{messageId: 'reduce'}];
const errorsReduceRight = [{messageId: 'reduceRight'}];

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
		'foo.notListed(fn);// reduce',
		// More or less argument(s)
		'foo.reduce();',
		'foo.reduce(fn, extraArgument1, extraArgument2);',
		'foo.reduce(...argumentsArray)',

		// Test `[].reduce.{call,apply}`
		// Not `CallExpression`
		'new [].reduce.call(foo, fn);',
		// Not `MemberExpression`
		'call(foo, fn);// reduce',
		'reduce.call(foo, fn);',
		// `callee.property` is not a `Identifier`
		'[].reduce["call"](foo, fn);',
		'[]["reduce"].call(foo, fn);',
		// Computed
		'[].reduce[call](foo, fn);',
		'[][reduce].call(foo, fn);',
		// Not listed method or property
		'[].reduce.notListed(foo, fn);',
		'[].notListed.call(foo, fn);// reduce',
		// Not empty
		'[1].reduce.call(foo, fn)',
		// Not ArrayExpression
		'"".reduce.call(foo, fn)',
		// More or less argument(s)
		// We are not checking arguments length

		// Test `Array.prototype.{call,apply}`
		// Not `CallExpression`
		'new Array.prototype.reduce.call(foo, fn);',
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
		'Array.prototype.notListed.call(foo, fn);// reduce',
		'Array.notListed.reduce.call(foo, fn);',
		// Not `Array`
		'NotArray.prototype.reduce.call(foo, fn);',
		// More or less argument(s)
		// We are not checking arguments length

		// `reduce-like`
		'array.reducex(foo)',
		'array.xreduce(foo)',
		'[].reducex.call(array, foo)',
		'[].xreduce.call(array, foo)',
		'Array.prototype.reducex.call(array, foo)',
		'Array.prototype.xreduce.call(array, foo)',

		// Second argument is not a function
		...notFunctionTypes.map(data => `Array.prototype.reduce.call(foo, ${data})`),

		// Option: allowSimpleOperations
		'array.reduce((total, item) => total + item)',
		'array.reduce((total, item) => { return total - item })',
		'array.reduce(function (total, item) { return total * item })',
		'array.reduce((total, item) => total + item, 0)',
		'array.reduce((total, item) => { return total - item }, 0 )',
		'array.reduce(function (total, item) { return total * item }, 0)',
		outdent`
			array.reduce((total, item) => {
				return (total / item) * 100;
			}, 0);
		`,
		'array.reduce((total, item) => { return total + item }, 0)',
	].flatMap(testCase => [testCase, testCase.replace('reduce', 'reduceRight')]),
	invalid: [
		'array.reduce((str, item) => str += item, "")',
		outdent`
			array.reduce((obj, item) => {
				obj[item] = null;
				return obj;
			}, {})
		`,
		'array.reduce((obj, item) => ({ [item]: null }), {})',
		outdent`
			const hyphenate = (str, char) => \`\${str}-\${char}\`;
			["a", "b", "c"].reduce(hyphenate);
		`,
		'[].reduce.call(array, (s, i) => s + i)',
		'[].reduce.call(array, sum);',
		'[].reduce.call(sum);',
		'Array.prototype.reduce.call(array, (s, i) => s + i)',
		'Array.prototype.reduce.call(array, sum);',
		'[].reduce.apply(array, [(s, i) => s + i])',
		'[].reduce.apply(array, [sum]);',
		'Array.prototype.reduce.apply(array, [(s, i) => s + i])',
		'Array.prototype.reduce.apply(array, [sum]);',
		outdent`
			array.reduce((total, item) => {
				return total + doComplicatedThings(item);
				function doComplicatedThings(item) {
					return item + 1;
				}
			}, 0);
		`,

		// Option: allowSimpleOperations
		{
			code: 'array.reduce((total, item) => total + item)',
			options: [{allowSimpleOperations: false}],
		},
		{
			code: 'array.reduce((total, item) => { return total - item })',
			options: [{allowSimpleOperations: false}],
		},
		{
			code: 'array.reduce(function (total, item) { return total * item })',
			options: [{allowSimpleOperations: false}],
		},
		{
			code: 'array.reduce((total, item) => total + item, 0)',
			options: [{allowSimpleOperations: false}],
		},
		{
			code: 'array.reduce((total, item) => { return total - item }, 0 )',
			options: [{allowSimpleOperations: false}],
		},
		{
			code: 'array.reduce(function (total, item) { return total * item }, 0)',
			options: [{allowSimpleOperations: false}],
		},
		{
			code: outdent`
				array.reduce((total, item) => {
					return (total / item) * 100;
				}, 0);
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
