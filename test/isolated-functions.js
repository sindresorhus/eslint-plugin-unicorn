import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const error = data => ({messageId: 'externally-scoped-variable', data});
const fooInMakeSynchronousError = error({name: 'foo', reason: 'callee of function named "makeSynchronous"'});

test({
	/** @type {import('eslint').RuleTester.ValidTestCase[]} */
	valid: [
		{
			name: 'variable defined in scope of isolated function',
			code: outdent`
				makeSynchronous(() => {
					const foo = 'hi';
					return foo.slice();
				});
			`,
		},
		{
			name: 'variable defined as parameter of isolated function',
			code: outdent`
				makeSynchronous(foo => {
					return foo.slice();
				});
			`,
		},
		{
			name: 'inner function can access outer function parameters',
			code: outdent`
				/** @isolated */
				function abc () {
					const foo = 'hi';
					const slice = () => foo.slice();
					return slice();
				}
			`,
		},
		{
			name: 'variable defined as parameter of isolated function (async)',
			code: outdent`
				makeSynchronous(async function (foo) {
					return foo.slice();
				});
			`,
		},
		{
			name: 'default global variables come from language options',
			code: 'makeSynchronous(() => process.env.MAP ? new Map() : new URL("https://example.com"))',
		},
		{
			name: 'global Array',
			code: 'makeSynchronous(() => new Array())',
		},
		{
			name: 'global Array w overrideGlobals: {} still works',
			code: 'makeSynchronous(() => new Array())',
			options: [{overrideGlobals: {}}],
		},
		{
			name: 'can implicitly allow global variables from language options',
			languageOptions: {globals: {foo: true}},
			code: outdent`
				makeSynchronous(function () {
					return foo.slice();
				});
			`,
		},
		{
			name: 'allow global variables separate from language options',
			languageOptions: {globals: {abc: true}},
			options: [{overrideGlobals: {foo: true}}],
			code: outdent`
				makeSynchronous(function () {
					return foo.slice();
				});
			`,
		},
		{
			name: 'typescript types are allowed to be out-of-scope',
			languageOptions: {
				parser: parsers.typescript,
			},
			code: outdent`
				const a = 1;
				type MyType = { foo: string };
				makeSynchronous(() => {
					const b: typeof a = 1;
					const f = <T extends MyType>(t: T) => t;
					let myType: MyType = { foo: 'bar' };
					myType = { foo: 'bar' } as MyType;
					myType = { foo: 'bar' } as const;
					myType = { foo: 'baz' } satisfies MyType;
					type X = typeof myType extends MyType ? true : false;
				});
			`,
		},
	],
	/** @type {import('eslint').RuleTester.InvalidTestCase[]} */
	invalid: [
		{
			name: 'out of scope variable under makeSynchronous (arrow function)',
			code: outdent`
				const foo = 'hi';
				makeSynchronous(() => foo.slice());
			`,
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'out of scope variable under makeSynchronous (async arrow function)',
			code: outdent`
				const foo = 'hi';
				makeSynchronous(async () => foo.slice());
			`,
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'out of scope variable under makeSynchronous (function expression)',
			code: outdent`
				const foo = 'hi';
				makeSynchronous(function () {
					return foo.slice();
				});
			`,
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'out of scope variable under makeSynchronous (async function expression)',
			code: outdent`
				const foo = 'hi';
				makeSynchronous(async function () {
					return foo.slice();
				});
			`,
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'out of scope variable under makeSynchronous (named function expression)',
			code: outdent`
				const foo = 'hi';
				makeSynchronous(function abc () {
					return foo.slice();
				});
			`,
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'out of scope variable under makeSynchronous (named async function expression)',
			code: outdent`
				const foo = 'hi';
				makeSynchronous(async function abc () {
					return foo.slice();
				});
			`,
			errors: [fooInMakeSynchronousError],
		},
		{
			name: '@isolated comment on function declaration',
			code: outdent`
				const foo = 'hi';
				/** @isolated */
				function abc () {
					return foo.slice();
				}
			`,
			errors: [error({name: 'foo', reason: 'follows comment "@isolated"'})],
		},
		{
			name: '@isolated comment on arrow function',
			code: outdent`
				const foo = 'hi';
				/** @isolated */
				const abc = () => foo.slice();
			`,
			errors: [error({name: 'foo', reason: 'follows comment "@isolated"'})],
		},
		{
			name: '@isolated comments with explanations',
			code: outdent`
				const foo = 'hi';
				// @isolated - explanation
				const abc1 = () => foo.slice();

				// @isolated -- explanation
				const abc2 = () => foo.slice();
			`,
			errors: [
				error({name: 'foo', reason: 'follows comment "@isolated"'}),
				error({name: 'foo', reason: 'follows comment "@isolated"'}),
			],
		},
		{
			name: '@isolated block comments',
			code: outdent`
				const foo = 'hi';
				/* @isolated */
				const abc1 = () => foo.slice();

				/** @isolated */
				const abc2 = () => foo.slice();

				/**
				 * @isolated
				 */
				const abc3 = () => foo.slice();
			`,
			errors: [
				error({name: 'foo', reason: 'follows comment "@isolated"'}),
				error({name: 'foo', reason: 'follows comment "@isolated"'}),
				error({name: 'foo', reason: 'follows comment "@isolated"'}),
			],
		},
		{
			name: '@isolated inline comment',
			code: outdent`
				const foo = 'hi';
				// @isolated
				const abc = () => foo.slice();
			`,
			errors: [error({name: 'foo', reason: 'follows comment "@isolated"'})],
		},
		{
			name: '@isolated comment on exports',
			code: outdent`
				const foo = 'hi';

				// @isolated
				export const abc = () => foo.slice();

				// @isolated
				export default () => foo.slice();
			`,
			errors: [
				error({name: 'foo', reason: 'follows comment "@isolated"'}),
				error({name: 'foo', reason: 'follows comment "@isolated"'}),
			],
		},
		{
			name: 'individual global variables can be explicitly disallowed',
			options: [{overrideGlobals: {URLSearchParams: 'readonly', URL: 'off'}}],
			code: outdent`
				makeSynchronous(function () {
					return new URL('https://example.com?') + new URLSearchParams({a: 'b'}).toString();
				});
			`,
			errors: [error({name: 'URL', reason: 'callee of function named "makeSynchronous"'})],
		},
		{
			name: 'check globals writability',
			code: outdent`
				makeSynchronous(function () {
					location = new URL('https://example.com');
					process = {env: {}};
					process.env.FOO = 'bar';
				});
			`,
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
			code: outdent`
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
			`,
			errors: [
				error({name: 'foo', reason: 'matches selector "FunctionDeclaration[id.name=/lambdaHandler.*/]"'}),
			],
		},
		{
			name: 'can explicitly turn off ecmascript globals',
			code: 'makeSynchronous(() => new Array())',
			options: [{overrideGlobals: {Array: 'off'}}],
			errors: [error({name: 'Array', reason: 'callee of function named "makeSynchronous"'})],
		},
	],
});
