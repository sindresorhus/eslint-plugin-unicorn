import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import notFunctionTypes from './utils/not-function-types.js';
import {getTester} from './utils/test.js';

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
	'some',
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

const invalidTestCase = (({code, options, method, name, suggestions}) => ({
	code,
	...options && {options},
	errors: [
		{
			...generateError(method, name),
			suggestions: suggestions.map(output => suggestionOutput(output, name)),
		},
	],
}));

const typeAware = testCase => ({
	...(typeof testCase === 'string' ? {code: testCase} : testCase),
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

const invalidMapCallbackTestCase = code => invalidTestCase({
	code,
	method: 'map',
	name: 'callback',
	suggestions: [
		code.replace('map(callback)', 'map((element) => callback(element))'),
		code.replace('map(callback)', 'map((element, index) => callback(element, index))'),
		code.replace('map(callback)', 'map((element, index, array) => callback(element, index, array))'),
	],
});

const invalidTypeAwareMapCallbackTestCase = code => typeAware(invalidMapCallbackTestCase(code));

test({
	valid: [
		...simpleMethods.map(method => `foo.${method}(element => fn(element))`),
		...reduceLikeMethods.map(method => `foo.${method}((accumulator, element) => fn(element))`),

		// Optional chaining
		...simpleMethods.map(method => `foo?.${method}(element => fn(element))`),
		...reduceLikeMethods.map(method => `foo?.${method}((accumulator, element) => fn(element))`),

		// `this.{map, filter, …}`
		...simpleMethods.map(method => `this.${method}(fn)`),
		...reduceLikeMethods.map(method => `this.${method}(fn)`),

		// `Boolean`
		'foo.find(Boolean)',
		'foo.some(Boolean)',

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

		// `ignore` option
		{
			code: 'Angular.forEach(list, fn)',
			options: [{ignore: ['Angular']}],
		},
		{
			code: 'P.map(list, fn)',
			options: [{ignore: ['P']}],
		},
		{
			code: 'myLib.utils.map(list, fn)',
			options: [{ignore: ['myLib.utils']}],
		},
		// `ignore` option — chained call
		{
			code: 'myLib(args).map(fn)',
			options: [{ignore: ['myLib']}],
		},
		// `ignore` option — default ignored callees still apply
		{
			code: 'Promise.map(list, fn)',
			options: [{ignore: ['Angular']}],
		},
		{
			code: 'lodash.map(list, fn)',
			options: [{ignore: ['Angular']}],
		},

		// First argument is not a function
		...notFunctionTypes.map(data => `foo.map(${data})`),
		'const query = {}; model.find(query)',
		'const taskName = "task"; service.find(taskName)',
		'const values = []; collection.map(values)',
		'const NotCallable = class {}; collection.map(NotCallable)',
		'const index = 1 + 1; collection.findIndex(index)',
		'const query = {}; const criteria = query; model.find(criteria)',

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

		// A receiver known to be a non-array from syntax alone is skipped, even without type information
		'const collection = new Set(); collection.forEach(callback);',
		'const collection = new Map(); collection.forEach(callback);',
		'class Foo {} const collection = new Foo(); collection.map(callback);',
	],
	invalid: [
		// Suggestions
		...simpleMethodsExceptForEach.map(method => invalidTestCase({
			code: `foo.${method}(fn)`,
			method,
			name: 'fn',
			suggestions: [
				`foo.${method}((element) => fn(element))`,
				`foo.${method}((element, index) => fn(element, index))`,
				`foo.${method}((element, index, array) => fn(element, index, array))`,
			],
		})),
		...simpleMethodsExceptForEach.map(method => invalidTestCase({
			code: `foo?.${method}(fn)`,
			method,
			name: 'fn',
			suggestions: [
				`foo?.${method}((element) => fn(element))`,
				`foo?.${method}((element, index) => fn(element, index))`,
				`foo?.${method}((element, index, array) => fn(element, index, array))`,
			],
		})),
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
		invalidTestCase({
			code: 'const callback = value => value; array.map(callback);',
			method: 'map',
			name: 'callback',
			suggestions: [
				'const callback = value => value; array.map((element) => callback(element));',
				'const callback = value => value; array.map((element, index) => callback(element, index));',
				'const callback = value => value; array.map((element, index, array) => callback(element, index, array));',
			],
		}),
		invalidTestCase({
			code: 'let query = {}; model.find(query);',
			method: 'find',
			name: 'query',
			suggestions: [
				'let query = {}; model.find((element) => query(element));',
				'let query = {}; model.find((element, index) => query(element, index));',
				'let query = {}; model.find((element, index, array) => query(element, index, array));',
			],
		}),
		invalidTestCase({
			code: 'array.map(fn)',
			method: 'map',
			name: 'fn',
			suggestions: [
				'array.map((element) => fn(element))',
				'array.map((element, index) => fn(element, index))',
				'array.map((element, index, array) => fn(element, index, array))',
			],
		}),
		invalidTestCase({
			code: 'foo.map(element)',
			method: 'map',
			name: 'element',
			suggestions: [
				'foo.map((element_) => element(element_))',
				'foo.map((element_, index) => element(element_, index))',
				'foo.map((element_, index, array) => element(element_, index, array))',
			],
		}),
		invalidTestCase({
			code: 'items.map(fn)',
			method: 'map',
			name: 'fn',
			suggestions: [
				'items.map((item) => fn(item))',
				'items.map((item, index) => fn(item, index))',
				'items.map((item, index, items) => fn(item, index, items))',
			],
		}),
		invalidTestCase({
			code: 'items.map(item)',
			method: 'map',
			name: 'item',
			suggestions: [
				'items.map((element) => item(element))',
				'items.map((element, index) => item(element, index))',
				'items.map((element, index, items) => item(element, index, items))',
			],
		}),
		invalidTestCase({
			code: 'items.map(items)',
			method: 'map',
			name: 'items',
			suggestions: [
				'items.map((item) => items(item))',
				'items.map((item, index) => items(item, index))',
				'items.map((item, index, array) => items(item, index, array))',
			],
		}),
		invalidTestCase({
			code: 'items.map(index)',
			method: 'map',
			name: 'index',
			suggestions: [
				'items.map((item) => index(item))',
				'items.map((item, index_) => index(item, index_))',
				'items.map((item, index_, items) => index(item, index_, items))',
			],
		}),
		invalidTestCase({
			code: 'items.map(item.fn)',
			method: 'map',
			suggestions: [
				'items.map((element) => item.fn(element))',
				'items.map((element, index) => item.fn(element, index))',
				'items.map((element, index, array) => item.fn(element, index, array))',
			],
		}),
		invalidTestCase({
			code: 'classes.map(fn)',
			method: 'map',
			name: 'fn',
			suggestions: [
				'classes.map((element) => fn(element))',
				'classes.map((element, index) => fn(element, index))',
				'classes.map((element, index, classes) => fn(element, index, classes))',
			],
		}),
		invalidTestCase({
			code: 'indices.map(fn)',
			method: 'map',
			name: 'fn',
			suggestions: [
				'indices.map((element) => fn(element))',
				'indices.map((element, index) => fn(element, index))',
				'indices.map((element, index, indices) => fn(element, index, indices))',
			],
		}),
		invalidTestCase({
			code: 'items.forEach(fn)',
			method: 'forEach',
			name: 'fn',
			suggestions: [
				'items.forEach((item) => { fn(item); })',
				'items.forEach((item, index) => { fn(item, index); })',
				'items.forEach((item, index, items) => { fn(item, index, items); })',
			],
		}),
		invalidTestCase({
			code: 'items.reduce(fn)',
			method: 'reduce',
			name: 'fn',
			suggestions: [
				'items.reduce((accumulator, item) => fn(accumulator, item))',
				'items.reduce((accumulator, item, index) => fn(accumulator, item, index))',
				'items.reduce((accumulator, item, index, items) => fn(accumulator, item, index, items))',
			],
		}),
		invalidTestCase({
			code: 'items.reduceRight(fn)',
			method: 'reduceRight',
			name: 'fn',
			suggestions: [
				'items.reduceRight((accumulator, item) => fn(accumulator, item))',
				'items.reduceRight((accumulator, item, index) => fn(accumulator, item, index))',
				'items.reduceRight((accumulator, item, index, items) => fn(accumulator, item, index, items))',
			],
		}),
		invalidTestCase({
			code: 'items.reduce(accumulator)',
			method: 'reduce',
			name: 'accumulator',
			suggestions: [
				'items.reduce((accumulator_, item) => accumulator(accumulator_, item))',
				'items.reduce((accumulator_, item, index) => accumulator(accumulator_, item, index))',
				'items.reduce((accumulator_, item, index, items) => accumulator(accumulator_, item, index, items))',
			],
		}),
		...reduceLikeMethods.map(method => invalidTestCase({
			code: `foo.${method}(fn)`,
			method,
			name: 'fn',
			suggestions: [
				`foo.${method}((accumulator, element) => fn(accumulator, element))`,
				`foo.${method}((accumulator, element, index) => fn(accumulator, element, index))`,
				`foo.${method}((accumulator, element, index, array) => fn(accumulator, element, index, array))`,
			],
		})),

		// 2 arguments
		...simpleMethodsExceptForEach.map(method => invalidTestCase({
			code: `foo.${method}(fn, thisArgument)`,
			method,
			name: 'fn',
			suggestions: [
				`foo.${method}((element) => fn(element), thisArgument)`,
				`foo.${method}((element, index) => fn(element, index), thisArgument)`,
				`foo.${method}((element, index, array) => fn(element, index, array), thisArgument)`,
			],
		})),
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
		...reduceLikeMethods.map(method => invalidTestCase({
			code: `foo.${method}(fn, initialValue)`,
			method,
			name: 'fn',
			suggestions: [
				`foo.${method}((accumulator, element) => fn(accumulator, element), initialValue)`,
				`foo.${method}((accumulator, element, index) => fn(accumulator, element, index), initialValue)`,
				`foo.${method}((accumulator, element, index, array) => fn(accumulator, element, index, array), initialValue)`,
			],
		})),

		// `Boolean` is only ignored on reasonable places
		...reduceLikeMethods.map(method => invalidTestCase({
			code: `foo.${method}(Boolean, initialValue)`,
			method,
			name: 'Boolean',
			suggestions: [
				`foo.${method}((accumulator, element) => Boolean(accumulator, element), initialValue)`,
				`foo.${method}((accumulator, element, index) => Boolean(accumulator, element, index), initialValue)`,
				`foo.${method}((accumulator, element, index, array) => Boolean(accumulator, element, index, array), initialValue)`,
			],
		})),
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
		...simpleMethodsExceptForEach.map(method => invalidTestCase({
			code: `foo.${method}(lib.fn)`,
			method,
			suggestions: [
				`foo.${method}((element) => lib.fn(element))`,
				`foo.${method}((element, index) => lib.fn(element, index))`,
				`foo.${method}((element, index, array) => lib.fn(element, index, array))`,
			],
		})),
		...reduceLikeMethods.map(method => invalidTestCase({
			code: `foo.${method}(lib.fn)`,
			method,
			suggestions: [
				`foo.${method}((accumulator, element) => lib.fn(accumulator, element))`,
				`foo.${method}((accumulator, element, index) => lib.fn(accumulator, element, index))`,
				`foo.${method}((accumulator, element, index, array) => lib.fn(accumulator, element, index, array))`,
			],
		})),

		// Need parenthesized

		invalidTestCase({
			code: 'foo.map(a || b)',
			method: 'map',
			suggestions: [
				'foo.map((element) => (a || b)(element))',
				'foo.map((element, index) => (a || b)(element, index))',
				'foo.map((element, index, array) => (a || b)(element, index, array))',
			],
		}),
		{
			code: 'array.map(condition ? toFile : toBuffer);',
			errors: [
				{
					...generateError('map', 'toFile'),
					suggestions: [
						suggestionOutput('array.map(condition ? (element) => toFile(element) : toBuffer);', 'toFile'),
						suggestionOutput('array.map(condition ? (element, index) => toFile(element, index) : toBuffer);', 'toFile'),
						suggestionOutput('array.map(condition ? (element, index, array) => toFile(element, index, array) : toBuffer);', 'toFile'),
					],
				},
				{
					...generateError('map', 'toBuffer'),
					suggestions: [
						suggestionOutput('array.map(condition ? toFile : (element) => toBuffer(element));', 'toBuffer'),
						suggestionOutput('array.map(condition ? toFile : (element, index) => toBuffer(element, index));', 'toBuffer'),
						suggestionOutput('array.map(condition ? toFile : (element, index, array) => toBuffer(element, index, array));', 'toBuffer'),
					],
				},
			],
		},
		{
			code: 'function * foo() { array.map(condition ? (yield toFile) : toBuffer); }',
			errors: [
				generateError('map'),
				{
					...generateError('map', 'toBuffer'),
					suggestions: [
						suggestionOutput('function * foo() { array.map(condition ? (yield toFile) : (element) => toBuffer(element)); }', 'toBuffer'),
						suggestionOutput('function * foo() { array.map(condition ? (yield toFile) : (element, index) => toBuffer(element, index)); }', 'toBuffer'),
						suggestionOutput('function * foo() { array.map(condition ? (yield toFile) : (element, index, array) => toBuffer(element, index, array)); }', 'toBuffer'),
					],
				},
			],
		},
		{
			code: 'async function foo() { array.map((await condition) ? toFile : toBuffer); }',
			errors: [
				{
					...generateError('map', 'toFile'),
					suggestions: [
						suggestionOutput('async function foo() { array.map((await condition) ? (element) => toFile(element) : toBuffer); }', 'toFile'),
						suggestionOutput('async function foo() { array.map((await condition) ? (element, index) => toFile(element, index) : toBuffer); }', 'toFile'),
						suggestionOutput('async function foo() { array.map((await condition) ? (element, index, array) => toFile(element, index, array) : toBuffer); }', 'toFile'),
					],
				},
				{
					...generateError('map', 'toBuffer'),
					suggestions: [
						suggestionOutput('async function foo() { array.map((await condition) ? toFile : (element) => toBuffer(element)); }', 'toBuffer'),
						suggestionOutput('async function foo() { array.map((await condition) ? toFile : (element, index) => toBuffer(element, index)); }', 'toBuffer'),
						suggestionOutput('async function foo() { array.map((await condition) ? toFile : (element, index, array) => toBuffer(element, index, array)); }', 'toBuffer'),
					],
				},
			],
		},

		// Actual messages
		{
			code: 'bar.map(fn)',
			errors: [
				{
					message: 'Do not pass function `fn` directly to `.map(…)`.',
					suggestions: [
						{
							desc: 'Replace function `fn` with `… => fn(element)`.',
							output: 'bar.map((element) => fn(element))',
						},
						{
							desc: 'Replace function `fn` with `… => fn(element, index)`.',
							output: 'bar.map((element, index) => fn(element, index))',
						},
						{
							desc: 'Replace function `fn` with `… => fn(element, index, array)`.',
							output: 'bar.map((element, index, array) => fn(element, index, array))',
						},
					],
				},
			],
		},
		{
			code: 'bar.reduce(fn)',
			errors: [
				{
					message: 'Do not pass function `fn` directly to `.reduce(…)`.',
					suggestions: [
						{
							desc: 'Replace function `fn` with `… => fn(accumulator, element)`.',
							output: 'bar.reduce((accumulator, element) => fn(accumulator, element))',
						},
						{
							desc: 'Replace function `fn` with `… => fn(accumulator, element, index)`.',
							output: 'bar.reduce((accumulator, element, index) => fn(accumulator, element, index))',
						},
						{
							desc: 'Replace function `fn` with `… => fn(accumulator, element, index, array)`.',
							output: 'bar.reduce((accumulator, element, index, array) => fn(accumulator, element, index, array))',
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

		// `ignore` option — non-matching callee is still reported
		invalidTestCase({
			code: 'Other.forEach(fn)',
			options: [{ignore: ['Angular']}],
			method: 'forEach',
			name: 'fn',
			suggestions: [
				'Other.forEach((element) => { fn(element); })',
				'Other.forEach((element, index) => { fn(element, index); })',
				'Other.forEach((element, index, array) => { fn(element, index, array); })',
			],
		}),
	],
});

// Ternaries
test.snapshot({
	valid: [
		'foo.map(_ ? () => {} : _ ? () => {} : () => {})',
		'foo.reduce(_ ? () => {} : _ ? () => {} : () => {})',
		'foo.every(_ ? Boolean : _ ? Boolean : Boolean)',
		'foo.map(_ ? String : _ ? Number : Boolean)',
	],
	invalid: [
		outdent`
			foo.map(
				_
					? String // This one should be ignored
					: callback
			);
		`,
		outdent`
			foo.forEach(
				_
					? callbackA
					: _
							? callbackB
							: callbackC
			);
		`,
		// Needs parentheses
		// Some of them were ignored since we know they are not callback function
		outdent`
			async function * foo () {
				foo.map((0, bar));
				foo.map(yield bar);
				foo.map(yield* bar);
				foo.map(() => bar);
				foo.map(bar &&= baz);
				foo.map(bar || baz);
				foo.map(bar + bar);
				foo.map(+ bar);
				foo.map(++ bar);
				foo.map(new Function(''));
			}
		`,
	],
});

test({
	valid: [
		typeAware(outdent`
			interface SearchService {
				find(callback: Function): unknown;
			}
			declare const callback: Function;
			declare const service: SearchService;
			service.find(callback);
		`),
		typeAware(outdent`
			class SearchService {
				find(taskName: string): unknown {
					return taskName;
				}
			}
			const service = new SearchService();
			const taskName = 'task';
			service.find(taskName);
		`),
		typeAware(outdent`
			declare const callback: Function;
			class Collection {
				map(callback: Function) {}
			}
			const collection = new Collection();
			collection.map(callback);
		`),
		typeAware(outdent`
			interface Model {
				find(query: object): unknown;
			}
			declare const AccountModel: Model;
			const query = {};
			AccountModel.find(query);
		`),
		typeAware(outdent`
			interface NgMocks {
				find(component: unknown): unknown;
			}
			declare const ngMocks: NgMocks;
			declare const MyComponent: unknown;
			ngMocks.find(MyComponent);
		`),
		typeAware(outdent`
			declare const callback: Function;
			declare const collection: string[] | {map(callback: Function): unknown};
			collection.map(callback);
		`),
		typeAware(outdent`
			declare const callback: Function;
			declare const set: Set<string>;
			set.forEach(callback);
		`),
		typeAware(outdent`
			declare const callback: Function;
			declare const map: Map<string, string>;
			map.forEach(callback);
		`),
		typeAware(outdent`
			declare const callback: Function;
			declare const service: {find(callback: Function): unknown} | undefined;
			service?.find(callback);
		`),
		typeAware(outdent`
			export {};
			type Array<T> = {map(callback: Function): unknown};
			declare const callback: Function;
			declare const collection: Array<string>;
			collection.map(callback);
		`),
		typeAware(outdent`
			export {};
			class Uint8Array {
				map(callback: Function) {}
			}
			declare const callback: Function;
			const collection = new Uint8Array();
			collection.map(callback);
		`),
	],
	invalid: [
		...[
			'declare const callback: Function; declare const array: string[]; array.map(callback);',
			'declare const callback: Function; declare const array: readonly string[]; array.map(callback);',
			'declare const callback: Function; declare const array: [string, string]; array.map(callback);',
			'declare const callback: Function; declare const array: Array<string>; array.map(callback);',
			'declare const callback: Function; declare const array: ReadonlyArray<string>; array.map(callback);',
			'declare const callback: Function; declare const array: Uint8Array; array.map(callback);',
			'declare const callback: Function; declare const array: string[] | readonly number[]; array.map(callback);',
			'declare const callback: Function; declare const array: string[] | Uint8Array; array.map(callback);',
			'declare const callback: Function; declare const array: string[] & {foo: string}; array.map(callback);',
			'declare const callback: Function; declare const array: string[] | undefined; array?.map(callback);',
			'declare const callback: Function; function run<T extends string[]>(array: T) { array.map(callback); }',
			'declare const callback: Function; function run<T extends readonly string[]>(array: T) { array.map(callback); }',
			'declare const callback: Function; class Strings extends Array<string> {} const array = new Strings(); array.map(callback);',
			'declare const callback: Function; interface S extends ReadonlyArray<string> {} declare const array: S; array.map(callback);',
			'declare const callback: Function; function run<T extends Uint8Array>(array: T) { array.map(callback); }',
			'declare const callback: Function; declare const array: any; array.map(callback);',
			'declare const callback: Function; declare const array: unknown; array.map(callback);',
			'declare const callback: Function; declare const array: MissingType; array.map(callback);',
		].map(code => invalidTypeAwareMapCallbackTestCase(code)),
	],
});

test.typescript({
	valid: [
		outdent`
			function isString(value: unknown): value is string {
				return typeof value === 'string';
			}
			foo.filter(isString);
		`,
		outdent`
			const isString = (value: unknown): value is string => typeof value === 'string';
			foo.filter(isString);
		`,
		outdent`
			const isString = function (value: unknown): value is string {
				return typeof value === 'string';
			};
			foo.filter(isString);
		`,
		outdent`
			const isString: (value: unknown) => value is string = value => typeof value === 'string';
			foo.filter(isString);
		`,
		outdent`
			function run(predicate: (value: unknown) => value is string) {
				foo.filter(predicate);
			}
		`,
		outdent`
			function runEvery(predicate: (value: unknown) => value is string) {
				foo.every(predicate);
			}
		`,
		outdent`
			function runFind(predicate: (value: unknown) => value is string) {
				foo.find(predicate);
			}
		`,
		outdent`
			function runFindLast(predicate: (value: unknown) => value is string) {
				foo.findLast(predicate);
			}
		`,
		outdent`
			function isString(value: unknown): value is string {
				return typeof value === 'string';
			}
			const guard: (value: unknown) => value is string = isString;
			foo.filter(guard);
		`,
		outdent`
			function isString(value: unknown): value is string {
				return typeof value === 'string';
			}
			foo.find(isString);
		`,
		outdent`
			function isString(value: unknown): value is string {
				return typeof value === 'string';
			}
			foo.every(isString);
		`,
		outdent`
			import {isString} from './guards';
			foo.filter(isString);
		`,
		outdent`
			import {isString} from './guards';
			foo.find(isString);
		`,
		outdent`
			import {isString} from './guards';
			foo.findLast(isString);
		`,
		outdent`
			import {isString} from './guards';
			foo.every(isString);
		`,
		outdent`
			function isString(value: unknown): value is string {
				return typeof value === 'string';
			}
			function isNumber(value: unknown): value is number {
				return typeof value === 'number';
			}
			foo.filter(condition ? isString : isNumber);
		`,
		outdent`
			const query = {} as const;
			model.find(query);
		`,
		outdent`
			const taskName = 'task' satisfies string;
			service.find(taskName);
		`,
		// A non-array receiver is resolved from its annotation alone, without type information
		'declare const collection: Set<string>; collection.forEach(callback);',
		'declare const collection: Map<string, string>; collection.forEach(callback);',
		'function run(collection: ReadonlySet<string>) { collection.forEach(callback); }',
		// A locally declared class shadowing a built-in name is not an array either
		outdent`
			class Uint8Array {
				map(callback: Function) {}
			}
			const collection = new Uint8Array();
			collection.map(callback);
		`,
		// A union is skipped as soon as one member is a non-array, since the call may land on that member
		'declare const collection: string[] | Set<string>; collection.forEach(callback);',
	],
	invalid: [
		// An array or typed array receiver is reported from its annotation alone, without type information
		...[
			'declare const array: string[]; array.map(callback);',
			'declare const array: readonly string[]; array.map(callback);',
			'declare const array: Array<string>; array.map(callback);',
			'declare const array: Uint8Array; array.map(callback);',
			'const array = new Uint8Array(); array.map(callback);',
			// Every member of the union is an indexed collection, so the callback contract is the same either way
			'declare const array: string[] | Uint8Array; array.map(callback);',
			// A nullish member is dropped first, because a nullish receiver throws before the callback matters
			'declare const array: string[] | undefined; array.map(callback);',
		].map(code => invalidMapCallbackTestCase(code)),
		invalidTestCase({
			code: outdent`
				function isString(value: unknown): boolean {
					return typeof value === 'string';
				}
				foo.filter(isString);
			`,
			method: 'filter',
			name: 'isString',
			suggestions: [
				outdent`
					function isString(value: unknown): boolean {
						return typeof value === 'string';
					}
					foo.filter((element) => isString(element));
				`,
				outdent`
					function isString(value: unknown): boolean {
						return typeof value === 'string';
					}
					foo.filter((element, index) => isString(element, index));
				`,
				outdent`
					function isString(value: unknown): boolean {
						return typeof value === 'string';
					}
					foo.filter((element, index, array) => isString(element, index, array));
				`,
			],
		}),
		invalidTestCase({
			code: outdent`
				function isString(value: unknown): value is string {
					return typeof value === 'string';
				}
				foo.map(isString);
			`,
			method: 'map',
			name: 'isString',
			suggestions: [
				outdent`
					function isString(value: unknown): value is string {
						return typeof value === 'string';
					}
					foo.map((element) => isString(element));
				`,
				outdent`
					function isString(value: unknown): value is string {
						return typeof value === 'string';
					}
					foo.map((element, index) => isString(element, index));
				`,
				outdent`
					function isString(value: unknown): value is string {
						return typeof value === 'string';
					}
					foo.map((element, index, array) => isString(element, index, array));
				`,
			],
		}),
		invalidTestCase({
			code: outdent`
				function isString(value: unknown): value is string {
					return typeof value === 'string';
				}
				function isObject(value: unknown): boolean {
					return typeof value === 'object';
				}
				foo.filter(condition ? isString : isObject);
			`,
			method: 'filter',
			name: 'isObject',
			suggestions: [
				outdent`
					function isString(value: unknown): value is string {
						return typeof value === 'string';
					}
					function isObject(value: unknown): boolean {
						return typeof value === 'object';
					}
					foo.filter(condition ? isString : (element) => isObject(element));
				`,
				outdent`
					function isString(value: unknown): value is string {
						return typeof value === 'string';
					}
					function isObject(value: unknown): boolean {
						return typeof value === 'object';
					}
					foo.filter(condition ? isString : (element, index) => isObject(element, index));
				`,
				outdent`
					function isString(value: unknown): value is string {
						return typeof value === 'string';
					}
					function isObject(value: unknown): boolean {
						return typeof value === 'object';
					}
					foo.filter(condition ? isString : (element, index, array) => isObject(element, index, array));
				`,
			],
		}),
	],
});
