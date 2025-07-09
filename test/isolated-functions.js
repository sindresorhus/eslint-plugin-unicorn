import stripIndent from 'strip-indent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const error = data => ({messageId: 'externally-scoped-variable', data});
const fooInMakeSynchronousError = error({name: 'foo', reason: 'callee of function named "makeSynchronous"'});

test({
	/** @type {import('eslint').RuleTester.InvalidTestCase[]} */
	invalid: [
		{
			name: 'out of scope variable under makeSynchronous (arrow function)',
			code: stripIndent(`
				const foo = 'hi';
				makeSynchronous(() => foo.slice());
			`),
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'out of scope variable under makeSynchronous (async arrow function)',
			code: stripIndent(`
				const foo = 'hi';
				makeSynchronous(async () => foo.slice());
			`),
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'out of scope variable under makeSynchronous (function expression)',
			code: stripIndent(`
				const foo = 'hi';
				makeSynchronous(function () {
					return foo.slice();
				});
			`),
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'out of scope variable under makeSynchronous (async function expression)',
			code: stripIndent(`
				const foo = 'hi';
				makeSynchronous(async function () {
					return foo.slice();
				});
			`),
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'out of scope variable under makeSynchronous (named function expression)',
			code: stripIndent(`
				const foo = 'hi';
				makeSynchronous(function abc () {
					return foo.slice();
				});
			`),
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'out of scope variable under makeSynchronous (named async function expression)',
			code: stripIndent(`
				const foo = 'hi';
				makeSynchronous(async function abc () {
					return foo.slice();
				});
			`),
			errors: [fooInMakeSynchronousError],
		},
		{
			name: '@isolated comment on function declaration',
			code: stripIndent(`
				const foo = 'hi';
				/** @isolated */
				function abc () {
					return foo.slice();
				}
			`),
			errors: [error({name: 'foo', reason: 'follows comment containing "@isolated"'})],
		},
		{
			name: '@isolated comment on arrow function',
			code: stripIndent(`
				const foo = 'hi';
				/** @isolated */
				const abc = () => foo.slice();
			`),
			errors: [error({name: 'foo', reason: 'follows comment containing "@isolated"'})],
		},
		{
			name: '@isolated inline comment',
			code: stripIndent(`
				const foo = 'hi';
				// @isolated
				const abc = () => foo.slice();
			`),
			errors: [error({name: 'foo', reason: 'follows comment containing "@isolated"'})],
		},
		{
			name: 'all global variables can be explicitly disallowed',
			languageOptions: {globals: {foo: true}},
			options: [{globals: {}}],
			code: stripIndent(`
				makeSynchronous(function () {
					return foo.slice();
				});
			`),
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'individual global variables can be explicitly disallowed',
			options: [{globals: {URLSearchParams: 'readonly', URL: 'off'}}],
			code: stripIndent(`
				makeSynchronous(function () {
					return new URL('https://example.com?') + new URLSearchParams({a: 'b'}).toString();
				});
			`),
			errors: [error({name: 'URL', reason: 'callee of function named "makeSynchronous"'})],
		},
		{
			name: 'check globals writability',
			code: stripIndent(`
				makeSynchronous(function () {
					location = new URL('https://example.com');
					process = {env: {}};
					process.env.FOO = 'bar';
				});
			`),
			errors: [
				// Only one error, `location = new URL('https://example.com')` and `process.env.FOO = 'bar'` are fine, the problem is `process = {...}`.
				error({
					name: 'process',
					reason: 'callee of function named "makeSynchronous" (global variable is not writable)',
				}),
			],
		},
		{
			name: 'make a function isolated by a selector',
			// In this case, we're imagining some naming convention for lambda functions that will be created via `fn.toString()`
			options: [{selectors: ['FunctionDeclaration[id.name=/lambdaHandler.*/]']}],
			code: stripIndent(`
				const foo = 'hi';

				function lambdaHandlerFoo() {
					return foo.slice();
				}

				function someOtherFunction() {
					return foo.slice();
				}

				createLambda({
					name: 'fooLambda',
					code: lambdaHandlerFoo.toString(),
				});
			`),
			errors: [
				error({name: 'foo', reason: 'matches selector "FunctionDeclaration[id.name=/lambdaHandler.*/]"'}),
			],
		},
	],
	/** @type {import('eslint').RuleTester.ValidTestCase[]} */
	valid: [
		{
			name: 'variable defined in scope of isolated function',
			code: stripIndent(`
				makeSynchronous(() => {
					const foo = 'hi';
					return foo.slice();
				});
			`),
		},
		{
			name: 'variable defined as parameter of isolated function',
			code: stripIndent(`
				makeSynchronous(foo => {
					return foo.slice();
				});
			`),
		},
		{
			name: 'inner function can access outer function parameters',
			code: stripIndent(`
				/** @isolated */
				function abc () {
					const foo = 'hi';
					const slice = () => foo.slice();
					return slice();
				}
			`),
		},
		{
			name: 'variable defined as parameter of isolated function (async)',
			code: stripIndent(`
				makeSynchronous(async function (foo) {
					return foo.slice();
				});
			`),
		},
		{
			name: 'can implicitly allow global variables from language options',
			languageOptions: {globals: {foo: true}},
			code: stripIndent(`
				makeSynchronous(function () {
					return foo.slice();
				});
			`),
		},
		{
			name: 'allow global variables separate from language options',
			languageOptions: {globals: {abc: true}},
			options: [{globals: {foo: true}}],
			code: stripIndent(`
				makeSynchronous(function () {
					return foo.slice();
				});
			`),
		},
	],
});
