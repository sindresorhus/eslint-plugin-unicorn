import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const error = data => ({messageId: 'externally-scoped-variable', data});
const superError = data => ({messageId: 'super', data});
const thisError = data => ({messageId: 'this-expression', data});
const fooInMakeSynchronousError = error({name: 'foo', reason: 'callee of function named "makeSynchronous"'});
const fooInWorkerizeError = error({name: 'foo', reason: 'callee of function named "workerize"'});
const fooInBrowserExecuteError = error({name: 'foo', reason: 'callee of method named "browser.execute"'});
const fooInPageEvaluateError = error({name: 'foo', reason: 'callee of method named "page.evaluate"'});
const fooInChromeScriptingExecuteScriptError = error({name: 'foo', reason: 'property "func" passed to "chrome.scripting.executeScript"'});
const fooInBrowserScriptingExecuteScriptError = error({name: 'foo', reason: 'property "func" passed to "browser.scripting.executeScript"'});

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
			name: 'allow global variables from ESLint comments',
			code: outdent`
				/* global foo */
				makeSynchronous(function () {
					return foo.slice();
				});
			`,
		},
		{
			name: 'allow writable global variables from ESLint comments',
			code: outdent`
				/* global foo:writable */
				makeSynchronous(function () {
					foo = 1;
				});
			`,
		},
		{
			name: 'override globals can allow writable globals',
			options: [{overrideGlobals: {foo: 'writable'}}],
			code: outdent`
				makeSynchronous(function () {
					foo = 1;
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
		{
			name: 'generic function names are not isolated by default',
			code: outdent`
				const foo = 'hi';
				memoize(() => foo.slice());
				serialize(() => foo.slice());
				isolate(() => foo.slice());
			`,
		},
		{
			name: 'dynamic computed executeScript func property is not isolated by default',
			code: outdent`
				const foo = 'hi';
				const func = 'func';
				chrome.scripting.executeScript({
					target: {tabId: 1},
					[func]: () => foo.slice(),
				});
			`,
		},
		{
			name: 'computed browser execution method names are not isolated by default',
			code: outdent`
				const foo = 'hi';
				browser['execute'](() => foo.slice());
				page['evaluate'](() => foo.slice());
				chrome.scripting['executeScript']({
					target: {tabId: 1},
					func: () => foo.slice(),
				});
			`,
		},
		{
			name: 'executeScript func identifier value is not isolated by default',
			code: outdent`
				const foo = 'hi';
				const func = () => foo.slice();
				chrome.scripting.executeScript({func});
			`,
		},
		{
			name: 'executeScript func accessors are not isolated by default',
			code: outdent`
				const foo = 'hi';
				chrome.scripting.executeScript({
					get func() {
						return () => foo.slice();
					},
					set func(value) {
						foo.slice(value);
					},
				});
			`,
		},
		{
			name: 'later executeScript object arguments are not isolated by default',
			code: outdent`
				const foo = 'hi';
				chrome.scripting.executeScript(target, {
					func: () => foo.slice(),
				});
			`,
		},
		{
			name: 'non-page evaluate methods are not isolated by default',
			code: outdent`
				const foo = 'hi';
				frame.evaluate(() => foo.slice());
			`,
		},
		{
			name: 'later browser.execute function arguments are not isolated by default',
			code: outdent`
				const foo = 'hi';
				browser.execute(() => 'browser', () => foo.slice());
			`,
		},
		{
			name: 'later page.evaluate function arguments are not isolated by default',
			code: outdent`
				const foo = 'hi';
				page.evaluate(() => 'page', () => foo.slice());
			`,
		},
		{
			name: '@isolated object method can use parameters, local variables, and globals',
			code: outdent`
				const object = {
					/** @isolated */
					method(foo) {
						const bar = foo.slice();
						return console.log(bar);
					},
				};
			`,
		},
		{
			name: '@isolated function can contain nested regular function with its own this',
			code: outdent`
				/** @isolated */
				function abc() {
					function getValue() {
						return this.value;
					}

					return getValue;
				}
			`,
		},
		{
			name: '@isolated function can contain nested class method with its own this',
			code: outdent`
				/** @isolated */
				function abc() {
					return class {
						method() {
							return this.value;
						}
					};
				}
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
			name: 'out of scope variable under workerize',
			code: outdent`
				const foo = 'hi';
				workerize(() => foo.slice());
			`,
			errors: [fooInWorkerizeError],
		},
		{
			name: 'out of scope variable under browser.execute',
			code: outdent`
				const foo = 'hi';
				browser.execute(() => foo.slice());
			`,
			errors: [fooInBrowserExecuteError],
		},
		{
			name: 'out of scope variable under page.evaluate',
			code: outdent`
				const foo = 'hi';
				page.evaluate(() => foo.slice());
			`,
			errors: [fooInPageEvaluateError],
		},
		{
			name: 'out of scope variable under chrome.scripting.executeScript',
			code: outdent`
				const foo = 'hi';
				chrome.scripting.executeScript({
					target: {tabId: 1},
					func: () => foo.slice(),
				});
			`,
			errors: [fooInChromeScriptingExecuteScriptError],
		},
		{
			name: 'out of scope variable under browser.scripting.executeScript',
			code: outdent`
				const foo = 'hi';
				browser.scripting.executeScript({
					target: {tabId: 1},
					func: () => foo.slice(),
				});
			`,
			errors: [fooInBrowserScriptingExecuteScriptError],
		},
		{
			name: 'out of scope variable under executeScript static computed func property',
			code: outdent`
				const foo = 'hi';
				chrome.scripting.executeScript({
					target: {tabId: 1},
					['func']: () => foo.slice(),
				});
			`,
			errors: [fooInChromeScriptingExecuteScriptError],
		},
		{
			name: 'out of scope variable under executeScript function expression',
			code: outdent`
				const foo = 'hi';
				chrome.scripting.executeScript({
					target: {tabId: 1},
					func: function () {
						return foo.slice();
					},
				});
			`,
			errors: [fooInChromeScriptingExecuteScriptError],
		},
		{
			name: 'out of scope variable under executeScript method shorthand',
			code: outdent`
				const foo = 'hi';
				browser.scripting.executeScript({
					target: {tabId: 1},
					func() {
						return foo.slice();
					},
				});
			`,
			errors: [fooInBrowserScriptingExecuteScriptError],
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
			name: '@isolated comment on object method',
			code: outdent`
				const foo = 'hi';

				const object = {
					/** @isolated */
					method() {
						return foo.slice();
					},
				};
			`,
			errors: [error({name: 'foo', reason: 'follows comment "@isolated"'})],
		},
		{
			name: '@isolated function reports external variable from nested regular function',
			code: outdent`
				const foo = 'hi';

				/** @isolated */
				function abc() {
					function getValue() {
						return foo.slice();
					}

					return getValue;
				}
			`,
			errors: [error({name: 'foo', reason: 'follows comment "@isolated"'})],
		},
		{
			name: '@isolated object method cannot use this',
			code: outdent`
				const object = {
					/** @isolated */
					method() {
						return this.foo;
					},
				};
			`,
			errors: [thisError({reason: 'follows comment "@isolated"'})],
		},
		{
			name: '@isolated comment on object property arrow function',
			code: outdent`
				const foo = 'hi';

				const object = {
					/** @isolated */
					method: () => foo.slice(),
				};
			`,
			errors: [error({name: 'foo', reason: 'follows comment "@isolated"'})],
		},
		{
			name: '@isolated comment on object property function expression',
			code: outdent`
				const foo = 'hi';

				const object = {
					/** @isolated */
					method: function () {
						return foo.slice();
					},
				};
			`,
			errors: [error({name: 'foo', reason: 'follows comment "@isolated"'})],
		},
		{
			name: '@isolated object property arrow function cannot use lexical this',
			code: outdent`
				const object = {
					/** @isolated */
					method: () => this.foo,
				};
			`,
			errors: [thisError({reason: 'follows comment "@isolated"'})],
		},
		{
			name: '@isolated object property function expression cannot use this',
			code: outdent`
				const object = {
					/** @isolated */
					method: function () {
						return this.foo;
					},
				};
			`,
			errors: [thisError({reason: 'follows comment "@isolated"'})],
		},
		{
			name: '@isolated comment on class method',
			code: outdent`
				const foo = 'hi';

				class Example {
					/** @isolated */
					method() {
						return foo.slice();
					}
				}
			`,
			errors: [error({name: 'foo', reason: 'follows comment "@isolated"'})],
		},
		{
			name: '@isolated class method cannot use this',
			code: outdent`
				class Example {
					/** @isolated */
					method() {
						return this.foo;
					}
				}
			`,
			errors: [thisError({reason: 'follows comment "@isolated"'})],
		},
		{
			name: '@isolated class method cannot use super',
			code: outdent`
				class Example extends Base {
					/** @isolated */
					method() {
						return super.foo;
					}
				}
			`,
			errors: [superError({reason: 'follows comment "@isolated"'})],
		},
		{
			name: '@isolated class method cannot use lexical this or super from nested arrow function',
			code: outdent`
				class Example extends Base {
					/** @isolated */
					method() {
						const getValue = () => this.foo + super.foo;
						return getValue;
					}
				}
			`,
			errors: [
				thisError({reason: 'follows comment "@isolated"'}),
				superError({reason: 'follows comment "@isolated"'}),
			],
		},
		{
			name: 'isolated makeSynchronous callback cannot use this',
			code: outdent`
				makeSynchronous(function () {
					return this.foo;
				});
			`,
			errors: [thisError({reason: 'callee of function named "makeSynchronous"'})],
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
			name: 'readonly global variables from ESLint comments cannot be written',
			code: outdent`
				/* global foo */
				makeSynchronous(function () {
					foo = 1;
				});
			`,
			errors: [
				error({
					name: 'foo',
					reason: 'callee of function named "makeSynchronous" (global variable is not writable)',
				}),
			],
		},
		{
			name: 'disabled global variables from ESLint comments are disallowed',
			code: outdent`
				/* global foo:off */
				makeSynchronous(function () {
					return foo.slice();
				});
			`,
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'disabled global variables from language options are disallowed',
			languageOptions: {globals: {foo: 'off'}},
			code: outdent`
				makeSynchronous(function () {
					return foo.slice();
				});
			`,
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'override globals take precedence over ESLint comments',
			options: [{overrideGlobals: {foo: 'readonly'}}],
			code: outdent`
				/* global foo:writable */
				makeSynchronous(function () {
					foo = 1;
				});
			`,
			errors: [
				error({
					name: 'foo',
					reason: 'callee of function named "makeSynchronous" (global variable is not writable)',
				}),
			],
		},
		{
			name: 'ESLint comment globals do not allow captured module variables',
			code: outdent`
				/* global foo */
				const foo = 'hi';
				makeSynchronous(function () {
					return foo.slice();
				});
			`,
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'language option globals do not allow captured module variables',
			languageOptions: {globals: {foo: true}},
			code: outdent`
				const foo = 'hi';
				makeSynchronous(function () {
					return foo.slice();
				});
			`,
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'override globals do not allow captured module variables',
			options: [{overrideGlobals: {foo: true}}],
			code: outdent`
				const foo = 'hi';
				makeSynchronous(function () {
					return foo.slice();
				});
			`,
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'override globals do not allow captured script variables',
			languageOptions: {sourceType: 'script'},
			options: [{overrideGlobals: {foo: true}}],
			code: outdent`
				var foo = 'hi';
				makeSynchronous(function () {
					return foo.slice();
				});
			`,
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'override globals do not allow captured script functions',
			languageOptions: {sourceType: 'script'},
			options: [{overrideGlobals: {foo: true}}],
			code: outdent`
				function foo() {}
				makeSynchronous(function () {
					return foo();
				});
			`,
			errors: [fooInMakeSynchronousError],
		},
		{
			name: 'inherited object properties are not treated as globals',
			code: 'makeSynchronous(() => constructor)',
			errors: [error({name: 'constructor', reason: 'callee of function named "makeSynchronous"'})],
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
