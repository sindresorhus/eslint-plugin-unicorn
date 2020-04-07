import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/no-fn-reference-in-iterator';

const ERROR_MESSAGE_ID = 'error';
const REPLACE_MESSAGE_ID = 'replace';

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
	env: {
		es6: true
	}
});

const generateError = (methodName, functionName) => ({
	messageId: ERROR_MESSAGE_ID,
	data: {
		methodName,
		functionName
	}
});

// Only test output is good enough
const suggestionOutput = output => ({
	messageId: REPLACE_MESSAGE_ID,
	output
});

const invalidTestCase = (({code, methodName, functionName, suggestions}) => ({
	code,
	output: code,
	errors: [
		{
			...generateError(methodName, functionName),
			suggestions: suggestions.map(output => suggestionOutput(output))
		}
	]

}));

ruleTester.run('no-fn-reference-in-iterator', rule, {
	valid: [
		...simpleMethods.map(methodName => `foo.${methodName}(element => fn(element))`),
		...reduceLikeMethods.map(methodName => `foo.${methodName}((accumulator, element) => fn(element))`),

		// `Boolean`
		...simpleMethods.map(methodName => `foo.${methodName}(Boolean)`),

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

		// TODO: support more types of iterator
		// Not `Identifier`
		'foo.map(lib.fn);',

		// Whitelisted
		'Promise.map(fn)',
		'Promise.forEach(fn)',
		'lodash.map(fn)',
		'underscore.map(fn)',
		'_.map(fn)',
		'Async.map(list, fn)',
		'async.map(list, fn)',
		'React.children.forEach(children, fn)'
	],
	invalid: [
		// Suggestions
		...simpleMethods.map(
			methodName => invalidTestCase({
				code: `foo.${methodName}(fn)`,
				methodName,
				functionName: 'fn',
				suggestions: [
					`foo.${methodName}((element) => fn(element))`,
					`foo.${methodName}((element, index) => fn(element, index))`,
					`foo.${methodName}((element, index, array) => fn(element, index, array))`
				]
			})
		),
		...reduceLikeMethods.map(
			methodName => invalidTestCase({
				code: `foo.${methodName}(fn)`,
				methodName,
				functionName: 'fn',
				suggestions: [
					`foo.${methodName}((accumulator, element) => fn(accumulator, element))`,
					`foo.${methodName}((accumulator, element, index) => fn(accumulator, element, index))`,
					`foo.${methodName}((accumulator, element, index, array) => fn(accumulator, element, index, array))`
				]
			})
		),

		// 2 arguments
		...simpleMethods.map(
			methodName => invalidTestCase({
				code: `foo.${methodName}(fn, thisArgument)`,
				methodName,
				functionName: 'fn',
				suggestions: [
					`foo.${methodName}((element) => fn(element), thisArgument)`,
					`foo.${methodName}((element, index) => fn(element, index), thisArgument)`,
					`foo.${methodName}((element, index, array) => fn(element, index, array), thisArgument)`
				]
			})
		),
		...reduceLikeMethods.map(
			methodName => invalidTestCase({
				code: `foo.${methodName}(fn, initialValue)`,
				methodName,
				functionName: 'fn',
				suggestions: [
					`foo.${methodName}((accumulator, element) => fn(accumulator, element), initialValue)`,
					`foo.${methodName}((accumulator, element, index) => fn(accumulator, element, index), initialValue)`,
					`foo.${methodName}((accumulator, element, index, array) => fn(accumulator, element, index, array), initialValue)`
				]
			})
		),

		// `Boolean` is not ignored on `reduce` and `reduceRight`
		...reduceLikeMethods.map(
			methodName => invalidTestCase({
				code: `foo.${methodName}(Boolean, initialValue)`,
				methodName,
				functionName: 'Boolean',
				suggestions: [
					`foo.${methodName}((accumulator, element) => Boolean(accumulator, element), initialValue)`,
					`foo.${methodName}((accumulator, element, index) => Boolean(accumulator, element, index), initialValue)`,
					`foo.${methodName}((accumulator, element, index, array) => Boolean(accumulator, element, index, array), initialValue)`
				]
			})
		),

		// #418
		invalidTestCase({
			code: outdent`
				const fn = (x, y) => x + y;
				[1, 2, 3].map(fn);
			`,
			methodName: 'map',
			functionName: 'fn',
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
