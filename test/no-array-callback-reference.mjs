import outdent from 'outdent';
import notFunctionTypes from './utils/not-function-types.mjs';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const ERROR_WITH_NAME_MESSAGE_ID = 'error-with-name';
const ERROR_WITHOUT_NAME_MESSAGE_ID = 'error-without-name';
const REPLACE_WITH_NAME_MESSAGE_ID = 'replace-with-name';
const REPLACE_WITHOUT_NAME_MESSAGE_ID = 'replace-without-name';

const simpleMethods = [
	'every',
	'filter',
	'find',
	'findIndex',
	'findLast',
	'findLastIndex',
	'flatMap',
	'forEach',
	'map',
];

const simpleMethodsExceptForEach = simpleMethods.filter(name => name !== 'forEach');

const reduceLikeMethods = [
	'reduce',
	'reduceRight',
];

const generateError = (method, name) => ({
	messageId: name ? ERROR_WITH_NAME_MESSAGE_ID : ERROR_WITHOUT_NAME_MESSAGE_ID,
	data: {
		method,
		name,
	},
});

// Only test output is good enough
const suggestionOutput = (output, name) => ({
	messageId: name ? REPLACE_WITH_NAME_MESSAGE_ID : REPLACE_WITHOUT_NAME_MESSAGE_ID,
	output,
});

const invalidTestCase = (({code, method, name, suggestions}) => ({
	code,
	errors: [
		{
			...generateError(method, name),
			suggestions: suggestions.map(output => suggestionOutput(output, name)),
		},
	],
}));

test({
	valid: [
		...simpleMethods.map(method => `foo.${method}(element => fn(element))`),
		...reduceLikeMethods.map(method => `foo.${method}((accumulator, element) => fn(element))`),

		// `this.{map, filter, …}`
		...simpleMethods.map(method => `this.${method}(fn)`),
		...reduceLikeMethods.map(method => `this.${method}(fn)`),

		// `Boolean`
		'foo.find(Boolean)',

		// Primitive wrappers are ignored
		'foo.map(String)',
		'foo.map(Number)',
		'foo.map(BigInt)',
		'foo.map(Boolean)',
		'foo.map(Symbol)',

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

		// Allowed
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

		// #1376
		'$(this).find(tooltip)',
		'$.map(realArray, function(value, index) {});',
		'$(this).filter(tooltip)',
		'jQuery(this).find(tooltip)',
		'jQuery.map(realArray, function(value, index) {});',
		'jQuery(this).filter(tooltip)',

		// First argument is not a function
		...notFunctionTypes.map(data => `foo.map(${data})`),

		// Ignored
		'foo.map(() => {})',
		'foo.map(function() {})',
		'foo.map(function bar() {})',

		// Exclude await expressions
		...simpleMethods.map(method => `(async () => await foo.${method}(bar))()`),
		'foo.map(function (a) {}.bind(bar))',

		// #813
		outdent`
			async function foo() {
				const clientId = 20
				const client = await oidc.Client.find(clientId)
			}
		`,

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
		`,

		// #1455 - mobx-state-tree
		outdent`
			const EventsStore = types.model('EventsStore', {
				events: types.optional(types.map(Event), {}),
			})
		`,
	],
	invalid: [
		// Suggestions
		...simpleMethodsExceptForEach.map(
			method => invalidTestCase({
				code: `foo.${method}(fn)`,
				method,
				name: 'fn',
				suggestions: [
					`foo.${method}((element) => fn(element))`,
					`foo.${method}((element, index) => fn(element, index))`,
					`foo.${method}((element, index, array) => fn(element, index, array))`,
				],
			}),
		),
		invalidTestCase({
			code: 'foo.forEach(fn)',
			method: 'forEach',
			name: 'fn',
			suggestions: [
				'foo.forEach((element) => { fn(element); })',
				'foo.forEach((element, index) => { fn(element, index); })',
				'foo.forEach((element, index, array) => { fn(element, index, array); })',
			],
		}),
		...reduceLikeMethods.map(
			method => invalidTestCase({
				code: `foo.${method}(fn)`,
				method,
				name: 'fn',
				suggestions: [
					`foo.${method}((accumulator, element) => fn(accumulator, element))`,
					`foo.${method}((accumulator, element, index) => fn(accumulator, element, index))`,
					`foo.${method}((accumulator, element, index, array) => fn(accumulator, element, index, array))`,
				],
			}),
		),

		// 2 arguments
		...simpleMethodsExceptForEach.map(
			method => invalidTestCase({
				code: `foo.${method}(fn, thisArgument)`,
				method,
				name: 'fn',
				suggestions: [
					`foo.${method}((element) => fn(element), thisArgument)`,
					`foo.${method}((element, index) => fn(element, index), thisArgument)`,
					`foo.${method}((element, index, array) => fn(element, index, array), thisArgument)`,
				],
			}),
		),
		invalidTestCase({
			code: 'foo.forEach(fn, thisArgument)',
			method: 'forEach',
			name: 'fn',
			suggestions: [
				'foo.forEach((element) => { fn(element); }, thisArgument)',
				'foo.forEach((element, index) => { fn(element, index); }, thisArgument)',
				'foo.forEach((element, index, array) => { fn(element, index, array); }, thisArgument)',
			],
		}),
		...reduceLikeMethods.map(
			method => invalidTestCase({
				code: `foo.${method}(fn, initialValue)`,
				method,
				name: 'fn',
				suggestions: [
					`foo.${method}((accumulator, element) => fn(accumulator, element), initialValue)`,
					`foo.${method}((accumulator, element, index) => fn(accumulator, element, index), initialValue)`,
					`foo.${method}((accumulator, element, index, array) => fn(accumulator, element, index, array), initialValue)`,
				],
			}),
		),

		// `Boolean` is only ignored on reasonable places
		...reduceLikeMethods.map(
			method => invalidTestCase({
				code: `foo.${method}(Boolean, initialValue)`,
				method,
				name: 'Boolean',
				suggestions: [
					`foo.${method}((accumulator, element) => Boolean(accumulator, element), initialValue)`,
					`foo.${method}((accumulator, element, index) => Boolean(accumulator, element, index), initialValue)`,
					`foo.${method}((accumulator, element, index, array) => Boolean(accumulator, element, index, array), initialValue)`,
				],
			}),
		),
		invalidTestCase({
			code: 'foo.forEach(Boolean)',
			method: 'forEach',
			name: 'Boolean',
			suggestions: [
				'foo.forEach((element) => { Boolean(element); })',
				'foo.forEach((element, index) => { Boolean(element, index); })',
				'foo.forEach((element, index, array) => { Boolean(element, index, array); })',
			],
		}),

		// Not `Identifier`
		...simpleMethodsExceptForEach.map(
			method => invalidTestCase({
				code: `foo.${method}(lib.fn)`,
				method,
				suggestions: [
					`foo.${method}((element) => lib.fn(element))`,
					`foo.${method}((element, index) => lib.fn(element, index))`,
					`foo.${method}((element, index, array) => lib.fn(element, index, array))`,
				],
			}),
		),
		...reduceLikeMethods.map(
			method => invalidTestCase({
				code: `foo.${method}(lib.fn)`,
				method,
				suggestions: [
					`foo.${method}((accumulator, element) => lib.fn(accumulator, element))`,
					`foo.${method}((accumulator, element, index) => lib.fn(accumulator, element, index))`,
					`foo.${method}((accumulator, element, index, array) => lib.fn(accumulator, element, index, array))`,
				],
			}),
		),

		// Need parenthesized
		invalidTestCase({
			code: 'foo.map(a ? b : c)',
			method: 'map',
			suggestions: [
				'foo.map((element) => (a ? b : c)(element))',
				'foo.map((element, index) => (a ? b : c)(element, index))',
				'foo.map((element, index, array) => (a ? b : c)(element, index, array))',
			],
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
						{
							desc: 'Replace function `fn` with `… => fn(element)`.',
							output: 'foo.map((element) => fn(element))',
						},
						{
							desc: 'Replace function `fn` with `… => fn(element, index)`.',
							output: 'foo.map((element, index) => fn(element, index))',
						},
						{
							desc: 'Replace function `fn` with `… => fn(element, index, array)`.',
							output: 'foo.map((element, index, array) => fn(element, index, array))',
						},
					],
				},
			],
		},
		{
			code: 'foo.reduce(fn)',
			errors: [
				{
					message: 'Do not pass function `fn` directly to `.reduce(…)`.',
					suggestions: [
						{
							desc: 'Replace function `fn` with `… => fn(accumulator, element)`.',
							output: 'foo.reduce((accumulator, element) => fn(accumulator, element))',
						},
						{
							desc: 'Replace function `fn` with `… => fn(accumulator, element, index)`.',
							output: 'foo.reduce((accumulator, element, index) => fn(accumulator, element, index))',
						},
						{
							desc: 'Replace function `fn` with `… => fn(accumulator, element, index, array)`.',
							output: 'foo.reduce((accumulator, element, index, array) => fn(accumulator, element, index, array))',
						},
					],
				},
			],
		},
		{
			code: 'foo.map(lib.fn)',
			errors: [
				{
					message: 'Do not pass function directly to `.map(…)`.',
					suggestions: [
						{
							desc: 'Replace function with `… => …(element)`.',
							output: 'foo.map((element) => lib.fn(element))',
						},
						{
							desc: 'Replace function with `… => …(element, index)`.',
							output: 'foo.map((element, index) => lib.fn(element, index))',
						},
						{
							desc: 'Replace function with `… => …(element, index, array)`.',
							output: 'foo.map((element, index, array) => lib.fn(element, index, array))',
						},
					],
				},
			],
		},
		{
			code: 'foo.reduce(lib.fn)',
			errors: [
				{
					message: 'Do not pass function directly to `.reduce(…)`.',
					suggestions: [
						{
							desc: 'Replace function with `… => …(accumulator, element)`.',
							output: 'foo.reduce((accumulator, element) => lib.fn(accumulator, element))',
						},
						{
							desc: 'Replace function with `… => …(accumulator, element, index)`.',
							output: 'foo.reduce((accumulator, element, index) => lib.fn(accumulator, element, index))',
						},
						{
							desc: 'Replace function with `… => …(accumulator, element, index, array)`.',
							output: 'foo.reduce((accumulator, element, index, array) => lib.fn(accumulator, element, index, array))',
						},
					],
				},
			],
		},

		// `await`
		invalidTestCase({
			code: outdent`
				const fn = async () => {
					await Promise.all(foo.map(toPromise));
				}
			`,
			method: 'map',
			name: 'toPromise',
			suggestions: [
				outdent`
					const fn = async () => {
						await Promise.all(foo.map((element) => toPromise(element)));
					}
				`,
				outdent`
					const fn = async () => {
						await Promise.all(foo.map((element, index) => toPromise(element, index)));
					}
				`,
				outdent`
					const fn = async () => {
						await Promise.all(foo.map((element, index, array) => toPromise(element, index, array)));
					}
				`,
			],
		}),
		invalidTestCase({
			code: outdent`
				async function fn() {
					for await (const foo of bar.map(toPromise)) {}
				}
			`,
			method: 'map',
			name: 'toPromise',
			suggestions: [
				outdent`
					async function fn() {
						for await (const foo of bar.map((element) => toPromise(element))) {}
					}
				`,
				outdent`
					async function fn() {
						for await (const foo of bar.map((element, index) => toPromise(element, index))) {}
					}
				`,
				outdent`
					async function fn() {
						for await (const foo of bar.map((element, index, array) => toPromise(element, index, array))) {}
					}
				`,
			],
		}),
		invalidTestCase({
			code: outdent`
				async function fn() {
					await foo.reduce(foo, Promise.resolve())
				}
			`,
			method: 'reduce',
			name: 'foo',
			suggestions: [
				outdent`
					async function fn() {
						await foo.reduce((accumulator, element) => foo(accumulator, element), Promise.resolve())
					}
				`,
				outdent`
					async function fn() {
						await foo.reduce((accumulator, element, index) => foo(accumulator, element, index), Promise.resolve())
					}
				`,
				outdent`
					async function fn() {
						await foo.reduce((accumulator, element, index, array) => foo(accumulator, element, index, array), Promise.resolve())
					}
				`,
			],
		}),

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
				`,
			],
		}),
	],
});
