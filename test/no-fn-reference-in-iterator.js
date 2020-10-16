import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import {rule} from './utils/test';
import notFunctionTypes from './utils/not-function-types';

const ERROR_WITH_NAME_MESSAGE_ID = 'error-with-name';
const ERROR_WITHOUT_NAME_MESSAGE_ID = 'error-without-name';

const simpleMethods = [
	'every',
	'filter',
	'find',
	'findIndex',
	'flatMap',
	'forEach',
	'map'
];

const reduceLikeMethods = [
	'reduce',
	'reduceRight'
];

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2021
	}
});

const generateError = (method, name) => ({
	messageId: name ? ERROR_WITH_NAME_MESSAGE_ID : ERROR_WITHOUT_NAME_MESSAGE_ID,
	data: {
		method,
		name
	}
});

// Only test output is good enough
const suggestionOutput = output => ({
	output
});

const invalidTestCase = (({code, method, name, suggestions}) => ({
	code,
	output: code,
	errors: [
		{
			...generateError(method, name),
			suggestions: suggestions.map(output => suggestionOutput(output))
		}
	]

}));

ruleTester.run('no-fn-reference-in-iterator', rule, {
	valid: [
		...simpleMethods.map(method => `foo.${method}(element => fn(element))`),
		...reduceLikeMethods.map(method => `foo.${method}((accumulator, element) => fn(element))`),

		// `this.{map, filter, …}`
		...simpleMethods.map(method => `this.${method}(fn)`),
		...reduceLikeMethods.map(method => `this.${method}(fn)`),

		// `Boolean`
		...simpleMethods.map(method => `foo.${method}(Boolean)`),

		// Not `CallExpression`
		'new foo.map(fn);',
		// Not `MemberExpression`
		'map(fn);',
		// `callee.property` is not a `Identifier`
		'foo[\'map\'](fn);',
		// Computed
		'foo[map](fn);',
		// Not listed method
		'foo.notListedMethod(fn);',
		// More or less argument(s)
		'foo.map();',
		'foo.map(fn, extraArgument1, extraArgument2);',
		'foo.map(...argumentsArray)',

		// Whitelisted
		'Promise.map(fn)',
		'Promise.forEach(fn)',
		'lodash.map(fn)',
		'underscore.map(fn)',
		'_.map(fn)',
		'Async.map(list, fn)',
		'async.map(list, fn)',
		'React.Children.forEach(children, fn)',
		'Children.forEach(children, fn)', // `import {Children} from 'react';`
		'Vue.filter(name, fn)',

		// First argument is not a function
		...notFunctionTypes.map(data => `foo.map(${data})`),

		// Ignored
		'foo.map(() => {})',
		'foo.map(function() {})',
		'foo.map(function bar() {})',

		// #755
		outdent`
			const results = collection
				.find({
					$and: [cursorQuery, params.query]
				}, {
					projection: params.projection
				})
				.sort($sort)
				.limit(params.limit + 1)
				.toArray()
		`
	],
	invalid: [
		// Suggestions
		...simpleMethods.map(
			method => invalidTestCase({
				code: `foo.${method}(fn)`,
				method,
				name: 'fn',
				suggestions: [
					`foo.${method}((element) => fn(element))`,
					`foo.${method}((element, index) => fn(element, index))`,
					`foo.${method}((element, index, array) => fn(element, index, array))`
				]
			})
		),
		...reduceLikeMethods.map(
			method => invalidTestCase({
				code: `foo.${method}(fn)`,
				method,
				name: 'fn',
				suggestions: [
					`foo.${method}((accumulator, element) => fn(accumulator, element))`,
					`foo.${method}((accumulator, element, index) => fn(accumulator, element, index))`,
					`foo.${method}((accumulator, element, index, array) => fn(accumulator, element, index, array))`
				]
			})
		),

		// 2 arguments
		...simpleMethods.map(
			method => invalidTestCase({
				code: `foo.${method}(fn, thisArgument)`,
				method,
				name: 'fn',
				suggestions: [
					`foo.${method}((element) => fn(element), thisArgument)`,
					`foo.${method}((element, index) => fn(element, index), thisArgument)`,
					`foo.${method}((element, index, array) => fn(element, index, array), thisArgument)`
				]
			})
		),
		...reduceLikeMethods.map(
			method => invalidTestCase({
				code: `foo.${method}(fn, initialValue)`,
				method,
				name: 'fn',
				suggestions: [
					`foo.${method}((accumulator, element) => fn(accumulator, element), initialValue)`,
					`foo.${method}((accumulator, element, index) => fn(accumulator, element, index), initialValue)`,
					`foo.${method}((accumulator, element, index, array) => fn(accumulator, element, index, array), initialValue)`
				]
			})
		),

		// `Boolean` is not ignored on `reduce` and `reduceRight`
		...reduceLikeMethods.map(
			method => invalidTestCase({
				code: `foo.${method}(Boolean, initialValue)`,
				method,
				name: 'Boolean',
				suggestions: [
					`foo.${method}((accumulator, element) => Boolean(accumulator, element), initialValue)`,
					`foo.${method}((accumulator, element, index) => Boolean(accumulator, element, index), initialValue)`,
					`foo.${method}((accumulator, element, index, array) => Boolean(accumulator, element, index, array), initialValue)`
				]
			})
		),

		// Not `Identifier`
		...simpleMethods.map(
			method => invalidTestCase({
				code: `foo.${method}(lib.fn)`,
				method,
				suggestions: [
					`foo.${method}((element) => lib.fn(element))`,
					`foo.${method}((element, index) => lib.fn(element, index))`,
					`foo.${method}((element, index, array) => lib.fn(element, index, array))`
				]
			})
		),
		...reduceLikeMethods.map(
			method => invalidTestCase({
				code: `foo.${method}(lib.fn)`,
				method,
				suggestions: [
					`foo.${method}((accumulator, element) => lib.fn(accumulator, element))`,
					`foo.${method}((accumulator, element, index) => lib.fn(accumulator, element, index))`,
					`foo.${method}((accumulator, element, index, array) => lib.fn(accumulator, element, index, array))`
				]
			})
		),

		// Need parenthesized
		invalidTestCase({
			code: 'foo.map(a ? b : c)',
			method: 'map',
			suggestions: [
				'foo.map((element) => (a ? b : c)(element))',
				'foo.map((element, index) => (a ? b : c)(element, index))',
				'foo.map((element, index, array) => (a ? b : c)(element, index, array))'
			]
		}),
		// Note: `await` is not handled, not sure if this is needed
		// invalidTestCase({
		// 	code: `foo.map(await foo())`,
		// 	method: 'map',
		// 	suggestions: [
		// 		`foo.map(async (accumulator, element) => (await foo())(accumulator, element))`,
		// 		`foo.map(async (accumulator, element, index) => (await foo())(accumulator, element, index))`,
		// 		`foo.map(async (accumulator, element, index, array) => (await foo())(accumulator, element, index, array))`
		// 	]
		// }),

		// Actual messages
		{
			code: 'foo.map(fn)',
			errors: [
				{
					message: 'Do not pass function `fn` directly to `.map(…)`.',
					suggestions: [
						{desc: 'Replace function `fn` with `… => fn(element)`.'},
						{desc: 'Replace function `fn` with `… => fn(element, index)`.'},
						{desc: 'Replace function `fn` with `… => fn(element, index, array)`.'}
					]
				}
			]
		},
		{
			code: 'foo.reduce(fn)',
			errors: [
				{
					message: 'Do not pass function `fn` directly to `.reduce(…)`.',
					suggestions: [
						{desc: 'Replace function `fn` with `… => fn(accumulator, element)`.'},
						{desc: 'Replace function `fn` with `… => fn(accumulator, element, index)`.'},
						{desc: 'Replace function `fn` with `… => fn(accumulator, element, index, array)`.'}
					]
				}
			]
		},
		{
			code: 'foo.map(lib.fn)',
			errors: [
				{
					message: 'Do not pass function directly to `.map(…)`.',
					suggestions: [
						{desc: 'Replace function with `… => …(element)`.'},
						{desc: 'Replace function with `… => …(element, index)`.'},
						{desc: 'Replace function with `… => …(element, index, array)`.'}
					]
				}
			]
		},
		{
			code: 'foo.reduce(lib.fn)',
			errors: [
				{
					message: 'Do not pass function directly to `.reduce(…)`.',
					suggestions: [
						{desc: 'Replace function with `… => …(accumulator, element)`.'},
						{desc: 'Replace function with `… => …(accumulator, element, index)`.'},
						{desc: 'Replace function with `… => …(accumulator, element, index, array)`.'}
					]
				}
			]
		},

		// #418
		invalidTestCase({
			code: outdent`
				const fn = (x, y) => x + y;
				[1, 2, 3].map(fn);
			`,
			method: 'map',
			name: 'fn',
			suggestions: [
				outdent`
					const fn = (x, y) => x + y;
					[1, 2, 3].map((element) => fn(element));
				`,
				outdent`
					const fn = (x, y) => x + y;
					[1, 2, 3].map((element, index) => fn(element, index));
				`,
				outdent`
					const fn = (x, y) => x + y;
					[1, 2, 3].map((element, index, array) => fn(element, index, array));
				`
			]
		})
	]
});
