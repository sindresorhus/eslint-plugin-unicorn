import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/prevent-abbreviations';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const browserES5RuleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 5
	},
	env: {
		browser: true
	}
});

const moduleRuleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module'
	}
});

const babelRuleTester = avaRuleTester(test, {
	parser: require.resolve('babel-eslint')
});

const typescriptRuleTester = avaRuleTester(test, {
	parser: require.resolve('@typescript-eslint/parser')
});

const noFixingTestCase = test => ({...test, output: test.code});

const createErrors = message => {
	const error = {
	};

	if (message) {
		error.message = message;
	}

	return [error];
};

const extendedOptions = [
	{
		replacements: {
			e: false,
			c: {
				custom: true
			},
			cb: {
				callback: false,
				circuitBreacker: true
			}
		}
	}
];

const noCheckShorthandImportsOptions = [
	{
		checkShorthandImports: false
	}
];

const noCheckDefaultAndNamespaceImports = [
	{
		checkDefaultAndNamespaceImports: false
	}
];

const customOptions = [
	{
		checkProperties: true,

		checkDefaultAndNamespaceImports: true,
		checkShorthandImports: true,
		checkShorthandProperties: true,

		checkFilenames: false,

		extendDefaultReplacements: false,
		replacements: {
			args: {
				arguments: true
			},
			e: {
				error: true,
				event: true,
				element: true
			},
			err: {
				error: true
			},
			y: {
				yield: true
			},
			errCb: {
				handleError: true
			},
			proto: {
				prototype: true
			}
		}
	}
];

const dontCheckVariablesOptions = [
	{
		checkVariables: false
	}
];

const checkPropertiesOptions = [
	{
		checkProperties: true
	}
];

const extendDefaultWhitelistOptions = [
	{
		whitelist: {
			err: true
		},
		extendDefaultWhitelist: true
	}
];

const noExtendDefaultWhitelistOptions = [
	{
		whitelist: {
			err: true
		},
		extendDefaultWhitelist: false
	}
];

ruleTester.run('prevent-abbreviations', rule, {
	valid: [
		'let x',
		'({x: 1})',
		'({x() {}})',
		'({[err]() {}})',
		'let error',
		'const {error} = {}',
		'({error: 1})',
		'({[err]: 1})',
		'error => {}',
		'({error}) => ({error})',
		'httpError => {}',
		'({httpError}) => ({httpError})',
		'(function (error) {})',
		'(function ({error}) {})',
		'function f(x) {}',
		'function f({x: y}) {}',
		'(class {})',
		'(class C {})',
		'class C {}',
		outdent`
			(class {
				error() {}
			})
		`,
		outdent`
			(class {
				[err]() {}
			})
		`,
		outdent`
			class C {
				x() {}
			}
		`,
		'foo.error',
		'foo.x',
		'let E',
		'let ESLint',
		'let isJPEG',
		'let NODE_ENV',

		// Property should not report by default
		'({err: 1})',
		'({e: 1})',
		'this.e = 1',
		'({e() {}})',
		'(class {e() {}})',
		'this.eResDir = 1',
		'this.err = 1',
		'({err() {}})',
		'(class {err() {}})',
		'this.errCbOptsObj = 1',
		'this.successCb = 1',
		'this.btnColor = 1',
		'({evt: 1})',
		'foo.evt = 1',
		outdent`
			const foo = {
				err() {}
			};
		`,
		'foo.err = 1',
		'foo.bar.err = 1',
		'this.err = 1',
		outdent`
			class C {
				err() {}
			}
		`,
		'this._err = 1',
		'this.__err__ = 1',
		'this.e_ = 1',
		'({Err: 1})',
		'({Res: 1})',
		'Foo.customProps = {}',
		outdent`
			class Foo {
				static getDerivedContextFromProps() {}
			}
		`,

		// Accessing banned names is allowed (as in `camelcase` rule)
		'foo.err',
		'foo.err()',
		'foo.bar.err',
		'foo.err.bar',
		'this.err',
		'({err: error}) => error',
		'const {err: httpError} = {}',

		// `err` in not defined, should not be report (could be reported by `no-unused-vars`)
		'console.log(err)',

		// `err` would be reported by `quote-props` if it's a problem for user
		'({"err": 1})',

		// Testing that options apply
		'let c',
		{
			code: 'var c',
			options: customOptions
		},

		{
			code: 'class cb {}',
			options: customOptions
		},

		{
			code: 'function e() {}',
			options: extendedOptions
		},

		{
			code: 'let err',
			options: dontCheckVariablesOptions
		},

		{
			code: '({__proto__: null})',
			options: customOptions
		},
		// `checkFilenames` option
		{
			code: 'foo();',
			filename: 'http-error.js'
		},
		{
			code: 'foo();',
			filename: 'http-err.js',
			options: customOptions
		},
		{
			code: 'foo();',
			filename: 'err/http-error.js'
		},

		// `extendDefaultWhitelist` option
		{
			code: 'const propTypes = 2;const err = 2;',
			options: extendDefaultWhitelistOptions
		}
	],

	invalid: [
		noFixingTestCase({
			code: 'let e',
			errors: createErrors('Please rename the variable `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: 'let eCbOpts',
			errors: createErrors('Please rename the variable `eCbOpts`. Suggested names are: `errorCallbackOptions`, `eventCallbackOptions`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: '({e: 1})',
			options: checkPropertiesOptions,
			errors: createErrors('Please rename the property `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: 'this.e = 1',
			options: checkPropertiesOptions,
			errors: createErrors('Please rename the property `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: '({e() {}})',
			options: checkPropertiesOptions,
			errors: createErrors('Please rename the property `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: '(class {e() {}})',
			options: checkPropertiesOptions,
			errors: createErrors('Please rename the property `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: 'this.eResDir = 1',
			options: checkPropertiesOptions,
			errors: createErrors('Please rename the property `eResDir`. Suggested names are: `errorResponseDirection`, `errorResponseDirectory`, `errorResultDirection`, ... (5 more omitted). A more descriptive name will do too.')
		}),

		// All suggested names should avoid capture
		{
			code: outdent`
				const a = 1;
				const var_ = 1;
				const used = 1;
			`,
			options: [
				{
					replacements: {
						a: {
							var: true,
							const: true,
							used: true
						}
					}
				}
			],
			errors: createErrors('Please rename the variable `a`. Suggested names are: `const_`, `used_`, `var__`. A more descriptive name will do too.')
		},

		{
			code: 'let err',
			output: 'let error',
			errors: createErrors('The variable `err` should be named `error`. A more descriptive name will do too.')
		},
		{
			code: 'let errCbOptsObj',
			output: 'let errorCallbackOptionsObject',
			errors: createErrors('The variable `errCbOptsObj` should be named `errorCallbackOptionsObject`. A more descriptive name will do too.')
		},
		{
			code: 'let stdDev',
			output: 'let standardDeviation',
			errors: createErrors('The variable `stdDev` should be named `standardDeviation`. A more descriptive name will do too.')
		},
		noFixingTestCase({
			code: '({err: 1})',
			options: checkPropertiesOptions,
			errors: createErrors('The property `err` should be named `error`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: 'this.err = 1',
			options: checkPropertiesOptions,
			errors: createErrors('The property `err` should be named `error`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: '({err() {}})',
			options: checkPropertiesOptions,
			errors: createErrors('The property `err` should be named `error`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: '(class {err() {}})',
			options: checkPropertiesOptions,
			errors: createErrors('The property `err` should be named `error`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: 'this.errCbOptsObj = 1',
			options: checkPropertiesOptions,
			errors: createErrors('The property `errCbOptsObj` should be named `errorCallbackOptionsObject`. A more descriptive name will do too.')
		}),

		{
			code: 'let successCb',
			output: 'let successCallback',
			errors: createErrors()
		},
		{
			code: 'let btnColor',
			output: 'let buttonColor',
			errors: createErrors()
		},

		noFixingTestCase({
			code: 'this.successCb = 1',
			options: checkPropertiesOptions,
			errors: createErrors()
		}),
		noFixingTestCase({
			code: 'this.btnColor = 1',
			options: checkPropertiesOptions,
			errors: createErrors()
		}),

		// This tests that the rule does not hang up on combinatoric explosion of possible replacements
		{
			code: 'let ' + 'CbE'.repeat(1024),
			output: 'let ' + 'CallbackE'.repeat(1024),
			errors: createErrors()
		},

		{
			code: 'let evt',
			output: 'let event',
			errors: createErrors('The variable `evt` should be named `event`. A more descriptive name will do too.')
		},
		noFixingTestCase({
			code: '({evt: 1})',
			options: checkPropertiesOptions,
			errors: createErrors('The property `evt` should be named `event`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: 'foo.evt = 1',
			options: checkPropertiesOptions,
			errors: createErrors('The property `evt` should be named `event`. A more descriptive name will do too.')
		}),

		// Testing that options apply
		{
			code: 'let args',
			output: 'let arguments',
			errors: createErrors()
		},
		{
			code: 'let args',
			output: 'let arguments',
			options: extendedOptions,
			errors: createErrors()
		},
		{
			code: 'let args',
			output: 'let arguments',
			options: customOptions,
			errors: createErrors()
		},

		{
			code: 'let c',
			output: 'let custom',
			options: extendedOptions,
			errors: createErrors()
		},

		{
			code: 'function cb() {}',
			output: 'function callback() {}',
			errors: createErrors()
		},
		{
			code: 'class cb {}',
			output: 'class circuitBreacker {}',
			options: extendedOptions,
			errors: createErrors()
		},

		noFixingTestCase({
			code: 'let e',
			errors: createErrors()
		}),
		noFixingTestCase({
			code: 'let e',
			options: customOptions,
			errors: createErrors()
		}),

		{
			code: 'let err',
			output: 'let error',
			errors: createErrors()
		},
		{
			code: 'let err',
			output: 'let error',
			options: extendedOptions,
			errors: createErrors()
		},
		{
			code: 'let err',
			output: 'let error',
			options: customOptions,
			errors: createErrors()
		},

		noFixingTestCase({
			code: '({err: 1})',
			options: checkPropertiesOptions,
			errors: createErrors()
		}),

		{
			code: 'let errCb',
			output: 'let errorCallback',
			errors: createErrors()
		},
		{
			code: 'let errCb',
			output: 'let errorCircuitBreacker',
			options: extendedOptions,
			errors: createErrors()
		},
		{
			code: 'let errCb',
			output: 'let handleError',
			options: customOptions,
			errors: createErrors()
		},
		{
			code: 'let ErrCb',
			output: 'let HandleError',
			options: customOptions,
			errors: createErrors()
		},
		{
			code: 'let ErrCb',
			output: 'let ErrorCallback',
			errors: createErrors()
		},
		{
			code: 'let ErrCb',
			output: 'let ErrorCircuitBreacker',
			options: extendedOptions,
			errors: createErrors()
		},
		{
			code: 'let ErrCb',
			output: 'let HandleError',
			options: customOptions,
			errors: createErrors()
		},

		// `errCb` should not match this
		{
			code: 'let fooErrCb',
			output: 'let fooErrorCb',
			options: customOptions,
			errors: createErrors()
		},
		{
			code: 'let errCbFoo',
			output: 'let errorCbFoo',
			options: customOptions,
			errors: createErrors()
		},

		{
			code: 'class Err {}',
			output: 'class Error_ {}',
			errors: createErrors()
		},

		noFixingTestCase({
			code: outdent`
				let e;
				console.log(e);
			`,
			errors: createErrors()
		}),

		{
			code: outdent`
				let err;
				console.log(err);
			`,
			output: outdent`
				let error;
				console.log(error);
			`,
			errors: createErrors()
		},

		{
			code: outdent`
				let error;
				{
					let err;
				}
			`,
			output: outdent`
				let error;
				{
					let error_;
				}
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				let error;
				let error_;
				{
					let err;
				}
			`,
			output: outdent`
				let error;
				let error_;
				{
					let error__;
				}
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				let error;
				{
					let err;
					console.log(error);
				}
			`,
			output: outdent`
				let error;
				{
					let error_;
					console.log(error);
				}
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				let error;
				{
					let err;
					console.log(error, err);
				}
			`,
			output: outdent`
				let error;
				{
					let error_;
					console.log(error, error_);
				}
			`,
			errors: createErrors()
		},

		{
			code: 'err => err',
			output: 'error => error',
			errors: createErrors()
		},

		{
			code: outdent`
				const opts = {};
				console.log(opts);
			`,
			output: outdent`
				const options = {};
				console.log(options);
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				var opts = 1;
				var opts = 2;
				console.log(opts);
			`,
			output: outdent`
				var options = 1;
				var options = 2;
				console.log(options);
			`,
			errors: createErrors()
		},

		{
			code: outdent`
				const err = {};
				const foo = {err};
			`,
			output: outdent`
				const error = {};
				const foo = {err: error};
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				const err = {};
				const foo = {
					a: 1,
					err,
					b: 2
				};
			`,
			output: outdent`
				const error = {};
				const foo = {
					a: 1,
					err: error,
					b: 2
				};
			`,
			errors: createErrors()
		},

		{
			code: '({err}) => err',
			output: '({err: error}) => error',
			options: customOptions,
			errors: createErrors()
		},
		{
			code: 'err => ({err})',
			output: 'error => ({err: error})',
			options: customOptions,
			errors: createErrors()
		},
		{
			code: 'const {err} = foo;',
			output: 'const {err: error} = foo;',
			options: customOptions,
			errors: createErrors()
		},

		noFixingTestCase({
			code: 'const foo = {err: 1}',
			options: checkPropertiesOptions,
			errors: createErrors()
		}),
		noFixingTestCase({
			code: outdent`
				const foo = {
					err() {}
				};
			`,
			options: checkPropertiesOptions,
			errors: createErrors()
		}),
		noFixingTestCase({
			code: 'foo.err = 1',
			options: checkPropertiesOptions,
			errors: createErrors()
		}),
		noFixingTestCase({
			code: 'foo.bar.err = 1',
			options: checkPropertiesOptions,
			errors: createErrors()
		}),
		noFixingTestCase({
			code: 'this.err = 1',
			options: checkPropertiesOptions,
			errors: createErrors()
		}),

		noFixingTestCase({
			code: outdent`
				class C {
					err() {}
				}
			`,
			options: checkPropertiesOptions,
			errors: createErrors()
		}),

		noFixingTestCase({
			code: 'this._err = 1',
			options: checkPropertiesOptions,
			errors: createErrors('The property `_err` should be named `_error`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: 'this.__err__ = 1',
			options: checkPropertiesOptions,
			errors: createErrors('The property `__err__` should be named `__error__`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: 'this.e_ = 1',
			options: checkPropertiesOptions,
			errors: createErrors('Please rename the property `e_`. Suggested names are: `error_`, `event_`. A more descriptive name will do too.')
		}),

		{
			code: 'let err_',
			output: 'let error_',
			errors: createErrors()
		},
		{
			code: 'let __err__',
			output: 'let __error__',
			errors: createErrors()
		},
		noFixingTestCase({
			code: 'let _e',
			errors: createErrors('Please rename the variable `_e`. Suggested names are: `_error`, `_event`. A more descriptive name will do too.')
		}),

		{
			code: 'class Err {}',
			output: 'class Error_ {}',
			errors: createErrors('The variable `Err` should be named `Error_`. A more descriptive name will do too.')
		},
		{
			code: 'class Cb {}',
			output: 'class Callback {}',
			errors: createErrors('The variable `Cb` should be named `Callback`. A more descriptive name will do too.')
		},
		noFixingTestCase({
			code: 'class Res {}',
			errors: createErrors('Please rename the variable `Res`. Suggested names are: `Response`, `Result`. A more descriptive name will do too.')
		}),
		{
			code: 'const Err = 1;',
			output: 'const Error_ = 1;',
			errors: createErrors()
		},
		{
			code: 'const _Err_ = 1;',
			output: 'const _Error_ = 1;',
			errors: createErrors()
		},
		noFixingTestCase({
			code: '({Err: 1})',
			options: checkPropertiesOptions,
			errors: createErrors('The property `Err` should be named `Error`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: '({Res: 1})',
			options: checkPropertiesOptions,
			errors: createErrors('Please rename the property `Res`. Suggested names are: `Response`, `Result`. A more descriptive name will do too.')
		}),

		{
			code: 'let doc',
			output: 'let document',
			errors: createErrors()
		},

		// `package` is a reserved word in strict mode
		{
			code: 'let pkg',
			output: 'let package',
			errors: createErrors()
		},
		{
			code: outdent`
				"use strict";
				let pkg;
			`,
			output: outdent`
				"use strict";
				let package_;
			`,
			errors: createErrors('The variable `pkg` should be named `package_`. A more descriptive name will do too.')
		},
		{
			code: outdent`
				"use strict";
				let pkg = 1;
				let package_ = 2;
			`,
			output: outdent`
				"use strict";
				let package__ = 1;
				let package_ = 2;
			`,
			errors: createErrors('The variable `pkg` should be named `package__`. A more descriptive name will do too.')
		},
		{
			code: outdent`
				"use strict";
				function foo() {
					const args = [...arguments];
					const pkg = 1;
				}
			`,
			output: outdent`
				"use strict";
				function foo() {
					const arguments_ = [...arguments];
					const package_ = 1;
				}
			`,
			errors: [
				...createErrors('The variable `args` should be named `arguments_`. A more descriptive name will do too.'),
				...createErrors('The variable `pkg` should be named `package_`. A more descriptive name will do too.')
			]
		},

		{
			code: 'let y',
			output: 'let yield_',
			options: customOptions,
			errors: createErrors()
		},

		{
			code: 'let errCb, errorCb',
			output: 'let errorCallback, errorCallback_',
			errors: createErrors().concat(createErrors())
		},
		{
			code: '{ let errCb }; { let errorCb }',
			output: '{ let errorCallback }; { let errorCallback }',
			errors: createErrors().concat(createErrors())
		},

		// The following test should have looked like this (commented one), but eslint's `RuleTester`
		// does not apply all fixes at once. See https://github.com/eslint/eslint/issues/11187#issuecomment-446380824
		/*
		{
			code: outdent`
				let errCb;
				{
					let errorCb;
					console.log(errCb, errorCb);
				}
			`,
			output: outdent`
				let errorCallback;
				{
					let errorCallback_;
					console.log(errorCallback, errorCallback_);
				}
			`,
			errors: createErrors().concat(createErrors())
		},
		*/
		{
			code: outdent`
				let errCb;
				{
					let errorCb;
					console.log(errCb, errorCb);
				}
			`,
			output: outdent`
				let errorCallback;
				{
					let errorCb;
					console.log(errorCallback, errorCb);
				}
			`,
			errors: createErrors().concat(createErrors())
		},

		{
			code: outdent`
				let err;
				({a: err = 1} = 2);
			`,
			output: outdent`
				let error;
				({a: error = 1} = 2);
			`,
			errors: createErrors()
		},

		// Renaming to `arguments` would result in a `SyntaxError`, so it should rename to `arguments_`
		{
			code: outdent`
				'use strict';
				let args;
			`,
			output: outdent`
				'use strict';
				let arguments_;
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				class A {
					method(...args) {
						return super.method(...args) + 1;
					}
				}
			`,
			output: outdent`
				class A {
					method(...arguments_) {
						return super.method(...arguments_) + 1;
					}
				}
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				class A extends B {
					constructor(...args) {
						super(...args);
					}
				}
			`,
			output: outdent`
				class A extends B {
					constructor(...arguments_) {
						super(...arguments_);
					}
				}
			`,
			errors: createErrors()
		},

		{
			code: outdent`
				const f = (...args) => {
					return args;
				}
			`,
			output: outdent`
				const f = (...arguments) => {
					return arguments;
				}
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				let args;
				const f = () => {
					return args;
				}
			`,
			output: outdent`
				let arguments;
				const f = () => {
					return arguments;
				}
			`,
			errors: createErrors()
		},

		// Renaming to `arguments` whould result in `f` returning it's arguments instead of the outer variable
		{
			code: outdent`
				let args;
				function f() {
					return args;
				}
			`,
			output: outdent`
				let arguments_;
				function f() {
					return arguments_;
				}
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				let args;
				function f() {
					return arguments + args;
				}
			`,
			output: outdent`
				let arguments_;
				function f() {
					return arguments + arguments_;
				}
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				let args;
				function f() {
					return g.apply(this, arguments) + args;
				}
			`,
			output: outdent`
				let arguments_;
				function f() {
					return g.apply(this, arguments) + arguments_;
				}
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				function unicorn(unicorn) {
					const {prop = {}} = unicorn;
					return property;
				}
			`,
			output: outdent`
				function unicorn(unicorn) {
					const {prop: property_ = {}} = unicorn;
					return property;
				}
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				const property = '';
				function unicorn() {
					const prop = 1;
					return property;
				}
			`,
			output: outdent`
				const property = '';
				function unicorn() {
					const property_ = 1;
					return property;
				}
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				function unicorn() {
					const prop = 1;
					return function () {
						return property;
					};
				}
			`,
			output: outdent`
				function unicorn() {
					const property_ = 1;
					return function () {
						return property;
					};
				}
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				let property;
				function unicorn() {
					const prop = 1;
					return property;
				}
			`,
			output: outdent`
				let property;
				function unicorn() {
					const property_ = 1;
					return property;
				}
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				/*global property:true*/
				function unicorn() {
					const prop = 1;
					return property;
				}
			`,
			output: outdent`
				/*global property:true*/
				function unicorn() {
					const property_ = 1;
					return property;
				}
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				/*global property:false*/
				function unicorn() {
					const prop = 1;
					return property;
				}
			`,
			output: outdent`
				/*global property:false*/
				function unicorn() {
					const property_ = 1;
					return property;
				}
			`,
			errors: createErrors()
		},
		// `checkFilenames` option
		{
			code: 'foo();',
			filename: 'err/http-err.js',
			errors: createErrors()
		},
		{
			code: 'foo();',
			filename: 'http-err.js',
			errors: createErrors()
		},
		{
			code: 'foo();',
			filename: '/path/to/doc/__prev-Attr$1Err__.conf.js',
			errors: createErrors('The filename `/path/to/doc/__prev-Attr$1Err__.conf.js` should be named `__previous-Attribute$1Error__.config.js`. A more descriptive name will do too.')
		},
		{
			code: 'foo();',
			filename: '.http.err.js',
			errors: createErrors('The filename `.http.err.js` should be named `.http.error.js`. A more descriptive name will do too.')
		},
		{
			code: 'foo();',
			filename: 'e.js',
			errors: createErrors('Please rename the filename `e.js`. Suggested names are: `error.js`, `event.js`. A more descriptive name will do too.')
		},
		{
			code: 'foo();',
			filename: 'c.js',
			options: extendedOptions,
			errors: createErrors('The filename `c.js` should be named `custom.js`. A more descriptive name will do too.')
		},
		{
			code: 'foo();',
			filename: 'cb.js',
			options: extendedOptions,
			errors: createErrors('The filename `cb.js` should be named `circuitBreacker.js`. A more descriptive name will do too.')
		},

		// `extendDefaultWhitelist` option
		{
			code: 'const propTypes = 2;const err = 2;',
			output: 'const propertyTypes = 2;const err = 2;',
			options: noExtendDefaultWhitelistOptions,
			errors: createErrors()
		}
	]
});

browserES5RuleTester.run('prevent-abbreviations', rule, {
	valid: [],
	invalid: [
		{
			code: 'var doc',
			output: 'var document_',
			errors: createErrors()
		},
		{
			code: outdent`
				var doc;
				document.querySelector(doc);
			`,
			output: outdent`
				var document_;
				document.querySelector(document_);
			`,
			errors: createErrors()
		},

		{
			code: 'var y',
			output: 'var yield',
			options: customOptions,
			errors: createErrors()
		},
		{
			code: outdent`
				"use strict";
				var y;
			`,
			output: outdent`
				"use strict";
				var yield_;
			`,
			options: customOptions,
			errors: createErrors()
		}
	]
});

moduleRuleTester.run('prevent-abbreviations', rule, {
	valid: [
		'import {err as foo} from "foo"',

		// Property should not report by default
		outdent`
			let foo;
			export {foo as err};
		`,

		// Path includes `node_modules`
		'import err from "./node_modules/err"',

		// Default import names are allowed
		'import err from "err"',
		'import err, {foo as bar} from "err"',
		'import {default as err, foo as bar} from "err"',

		// Namespace import names are allowed
		'import * as err from "err"',
		'import foo, * as err from "err"',
		'const err = require("err")',

		// Named import name is allowed
		'import {err} from "err"',
		'import foo, {err} from "err"',
		'import {default as foo, err} from "err"',

		// Names from object destructuring are allowed
		'const {err} = require("err")',
		'const {err} = foo',
		'function f({err}) {}',

		// Option checkDefaultAndNamespaceImports: false
		{
			code: 'const err = require("err")',
			options: noCheckDefaultAndNamespaceImports
		},
		{
			code: 'const err = require("./err")',
			options: noCheckDefaultAndNamespaceImports
		},
		{
			code: 'import foo, * as err from "err"',
			options: noCheckDefaultAndNamespaceImports
		},
		{
			code: 'import foo, * as err from "./err"',
			options: noCheckDefaultAndNamespaceImports
		},
		{
			code: 'import { default as err, foo as bar } from "err"',
			options: noCheckDefaultAndNamespaceImports
		},
		{
			code: 'import { default as err, foo as bar } from "./err"',
			options: noCheckDefaultAndNamespaceImports
		},
		{
			code: 'import err, { foo as bar } from "err"',
			options: noCheckDefaultAndNamespaceImports
		},
		{
			code: 'import err, { foo as bar } from "./err"',
			options: noCheckDefaultAndNamespaceImports
		},
		{
			code: 'import * as err from "err"',
			options: noCheckDefaultAndNamespaceImports
		},
		{
			code: 'import * as err from "./err"',
			options: noCheckDefaultAndNamespaceImports
		},
		{
			code: 'import err from "err"',
			options: noCheckDefaultAndNamespaceImports
		},
		{
			code: 'import err from "./err"',
			options: noCheckDefaultAndNamespaceImports
		},

		// Option checkShorthandImports: false
		{
			code: 'import { err } from "err"',
			options: noCheckShorthandImportsOptions
		},
		{
			code: 'import { err } from "./err"',
			options: noCheckShorthandImportsOptions
		},
		{
			code: 'import { default as foo, err } from "err"',
			options: noCheckShorthandImportsOptions
		},
		{
			code: 'import { default as foo, err } from "./err"',
			options: noCheckShorthandImportsOptions
		}
	],

	invalid: [
		{
			code: outdent`
				import err from 'err';
			`,
			output: outdent`
				import error from 'err';
			`,
			options: customOptions,
			errors: createErrors()
		},
		{
			code: outdent`
				import {err} from 'err';
			`,
			output: outdent`
				import {err as error} from 'err';
			`,
			options: customOptions,
			errors: createErrors()
		},
		{
			code: outdent`
				import {
					bar,
					err,
					buz,
				} from 'foo';
			`,
			output: outdent`
				import {
					bar,
					err as error,
					buz,
				} from 'foo';
			`,
			options: customOptions,
			errors: createErrors()
		},

		{
			code: outdent`
				import {err as cb} from 'err';
			`,
			output: outdent`
				import {err as callback} from 'err';
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				const {err: cb} = foo;
			`,
			output: outdent`
				const {err: callback} = foo;
			`,
			errors: createErrors()
		},

		// Internal import
		{
			code: 'const err = require("../err")',
			output: 'const error = require("../err")',
			errors: createErrors()
		},
		{
			code: 'const err = require("/err")',
			output: 'const error = require("/err")',
			errors: createErrors()
		},
		{
			code: 'import err from "./err"',
			output: 'import error from "./err"',
			errors: createErrors()
		},
		{
			code: 'import err, {foo as bar} from "./err"',
			output: 'import error, {foo as bar} from "./err"',
			errors: createErrors()
		},
		{
			code: 'import {default as err, foo as bar} from "./err"',
			output: 'import {default as error, foo as bar} from "./err"',
			errors: createErrors()
		},
		{
			code: 'import * as err from "./err"',
			output: 'import * as error from "./err"',
			errors: createErrors()
		},
		{
			code: 'import foo, * as err from "./err"',
			output: 'import foo, * as error from "./err"',
			errors: createErrors()
		},
		{
			code: 'import {err} from "./err"',
			output: 'import {err as error} from "./err"',
			errors: createErrors()
		},
		{
			code: 'import {default as foo, err} from "./err"',
			output: 'import {default as foo, err as error} from "./err"',
			errors: createErrors()
		},

		{
			code: outdent`
				let err;
				export {err};
			`,
			output: outdent`
				let error;
				export {error as err};
			`,
			errors: createErrors()
		},

		noFixingTestCase({
			code: 'export const err = {}',
			errors: createErrors()
		}),
		noFixingTestCase({
			code: 'export let err',
			errors: createErrors()
		}),
		noFixingTestCase({
			code: 'export var err',
			errors: createErrors()
		}),
		noFixingTestCase({
			code: 'export function err() {}',
			errors: createErrors()
		}),
		noFixingTestCase({
			code: 'export class err {}',
			errors: createErrors()
		}),

		{
			code: outdent`
				const err = {};
				export const error = err;
			`,
			output: outdent`
				const error_ = {};
				export const error = error_;
			`,
			errors: createErrors()
		},

		{
			code: outdent`
				class err {};
				console.log(err);
			`,
			output: outdent`
				class error {};
				console.log(error);
			`,
			errors: createErrors()
		},

		{
			code: outdent`
				class err {
					constructor() {
						console.log(err);
					}
				};
				console.log(err);
			`,
			output: outdent`
				class error {
					constructor() {
						console.log(error);
					}
				};
				console.log(error);
			`,
			errors: createErrors()
		},

		noFixingTestCase({
			code: outdent`
				let foo;
				export {foo as err};
			`,
			options: checkPropertiesOptions,
			errors: createErrors()
		})
	]
});

babelRuleTester.run('prevent-abbreviations', rule, {
	valid: [
		// Whitelisted names
		'Foo.defaultProps = {}',
		outdent`
			class Foo {
				static propTypes = {};
				static getDerivedStateFromProps() {}
			}
		`,

		// Property should not report by default
		outdent`
			class Foo {
				static propTypesAndStuff = {};
			}
		`,
		'(class {e = 1})',
		'(class {err = 1})',
		outdent`
			class C {
				err = () => {}
			}
		`
	],
	invalid: [
		{
			code: outdent`
				function unicorn(unicorn) {
					const {prop = {}} = unicorn;
					return property;
				}
			`,
			output: outdent`
				function unicorn(unicorn) {
					const {prop: property_ = {}} = unicorn;
					return property;
				}
			`,
			errors: createErrors()
		},
		{
			code: '({err}) => err',
			output: '({err: error}) => error',
			options: customOptions,
			errors: createErrors()
		},
		{
			code: 'err => ({err})',
			output: 'error => ({err: error})',
			options: customOptions,
			errors: createErrors()
		},
		{
			code: 'Foo.customProps = {}',
			options: checkPropertiesOptions,
			errors: createErrors()
		},
		{
			code: outdent`
				class Foo {
					static propTypesAndStuff = {};
				}
			`,
			options: checkPropertiesOptions,
			errors: createErrors()
		},
		{
			code: outdent`
				class Foo {
					static getDerivedContextFromProps() {}
				}
			`,
			options: checkPropertiesOptions,
			errors: createErrors()
		},

		// #347
		{
			code: outdent`
				function onKeyDown(e: KeyboardEvent) {
					if (e.keyCode) {}
				}
			`,
			output: outdent`
				function onKeyDown(event: KeyboardEvent) {
					if (event.keyCode) {}
				}
			`,
			options: [
				{
					extendDefaultReplacements: false,
					replacements: {
						e: {
							event: true
						}
					}
				}
			],
			errors: createErrors()
		},

		// https://github.com/facebook/relay/blob/597d2a17aa29d401830407b6814a5f8d148f632d/packages/relay-experimental/EntryPointTypes.flow.js#L138
		{
			code: outdent`
				export type PreloadProps<TExtraProps = null> = {}
			`,
			output: outdent`
				export type PreloadProperties<TExtraProperties = null> = {}
			`,
			errors: [...createErrors(), ...createErrors()]
		},

		noFixingTestCase({
			code: '(class {e = 1})',
			options: checkPropertiesOptions,
			errors: createErrors('Please rename the property `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: '(class {err = 1})',
			options: checkPropertiesOptions,
			errors: createErrors('The property `err` should be named `error`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: outdent`
				class C {
					err = () => {}
				}
			`,
			options: checkPropertiesOptions,
			errors: createErrors()
		})
	]
});

typescriptRuleTester.run('prevent-abbreviations', rule, {
	valid: [],
	invalid: [
		// Types
		...[
			'declare const prop: string;',
			'declare const prop: string;',
			'declare var prop: number;',
			'declare let prop: any;',
			'declare class prop {}',
			'const prop: SomeThing<boolean> = func();'
		].map(code => ({
			code,
			output: code.replace('prop', 'property'),
			errors: createErrors()
		})),

		// #763
		{
			code: 'const foo = (extraParams?: string) => {}',
			output: 'const foo = (extraParameters?: string) => {}',
			errors: createErrors()
		}
	]
});
