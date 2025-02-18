import outdent from 'outdent';
import {getTester, avoidTestTitleConflict} from './utils/test.js';

const {test} = getTester(import.meta);

const createErrors = message => [{message}];

const extendedOptions = [
	{
		replacements: {
			e: false,
			c: {
				custom: true,
			},
			cb: {
				callback: false,
				circuitBreacker: true,
			},
		},
	},
];

const noCheckShorthandImportsOptions = [
	{
		checkShorthandImports: false,
	},
];

const noCheckDefaultAndNamespaceImports = [
	{
		checkDefaultAndNamespaceImports: false,
	},
];

const customOptions = [
	{
		checkProperties: true,

		checkDefaultAndNamespaceImports: true,
		checkShorthandImports: true,
		checkShorthandProperties: true,

		extendDefaultReplacements: false,
		replacements: {
			args: {
				arguments: true,
			},
			e: {
				error: true,
				event: true,
				element: true,
			},
			err: {
				error: true,
			},
			y: {
				yield: true,
			},
			errCb: {
				handleError: true,
			},
			proto: {
				prototype: true,
			},
		},
	},
];

const dontCheckVariablesOptions = [
	{
		checkVariables: false,
	},
];

const checkPropertiesOptions = [
	{
		checkProperties: true,
	},
];

const extendDefaultAllowListOptions = [
	{
		allowList: {
			err: true,
		},
		extendDefaultAllowList: true,
	},
];

const noExtendDefaultAllowListOptions = [
	{
		allowList: {
			err: true,
		},
		extendDefaultAllowList: false,
	},
];

const tests = {
	testerOptions: {
		languageOptions: {
			globals: {
				document: 'readonly',
				event: 'readonly',
				Response: 'readonly',
			},
		},
	},
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
		'const i18n = new I18n({ locales: ["en", "fr"] })',
		'const i18nData = {}',
		'const l10n = new L10n()',
		'const iOS = true',
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
			options: customOptions,
		},

		{
			code: 'class cb {}',
			options: customOptions,
		},

		{
			code: 'function e() {}',
			options: extendedOptions,
		},

		{
			code: 'let err',
			options: dontCheckVariablesOptions,
		},

		{
			code: '({__proto__: null})',
			options: customOptions,
		},

		// `extendDefaultAllowList` option
		{
			code: 'const propTypes = 2;const err = 2;',
			options: extendDefaultAllowListOptions,
		},
	],

	invalid: [
		{
			code: 'let e',
			errors: createErrors('Please rename the variable `e`. Suggested names are: `error`, `event_`. A more descriptive name will do too.'),
		},
		{
			code: 'let eCbOpts',
			errors: createErrors('Please rename the variable `eCbOpts`. Suggested names are: `errorCallbackOptions`, `eventCallbackOptions`. A more descriptive name will do too.'),
		},
		{
			code: '({e: 1})',
			options: checkPropertiesOptions,
			errors: createErrors('Please rename the property `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.'),
		},
		{
			code: 'this.e = 1',
			options: checkPropertiesOptions,
			errors: createErrors('Please rename the property `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.'),
		},
		{
			code: '({e() {}})',
			options: checkPropertiesOptions,
			errors: createErrors('Please rename the property `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.'),
		},
		{
			code: '(class {e() {}})',
			options: checkPropertiesOptions,
			errors: createErrors('Please rename the property `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.'),
		},
		{
			code: 'this.eResDir = 1',
			options: checkPropertiesOptions,
			errors: createErrors('Please rename the property `eResDir`. Suggested names are: `errorResourceDirection`, `errorResourceDirectory`, `errorResponseDirection`, ... (9 more omitted). A more descriptive name will do too.'),
		},

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
							used: true,
						},
						var: false,
					},
				},
			],

			errors: createErrors('Please rename the variable `a`. Suggested names are: `const_`, `used_`, `var__`. A more descriptive name will do too.'),
		},

		{
			code: 'let err',
			output: 'let error',
			errors: createErrors('The variable `err` should be named `error`. A more descriptive name will do too.'),
		},
		{
			code: 'let errCbOptsObj',
			output: 'let errorCallbackOptionsObject',
			errors: createErrors('The variable `errCbOptsObj` should be named `errorCallbackOptionsObject`. A more descriptive name will do too.'),
		},
		{
			code: 'let stdDev',
			output: 'let standardDeviation',
			errors: createErrors('The variable `stdDev` should be named `standardDeviation`. A more descriptive name will do too.'),
		},
		{
			code: '({err: 1})',
			options: checkPropertiesOptions,
			errors: createErrors('The property `err` should be named `error`. A more descriptive name will do too.'),
		},
		{
			code: 'this.err = 1',
			options: checkPropertiesOptions,
			errors: createErrors('The property `err` should be named `error`. A more descriptive name will do too.'),
		},
		{
			code: '({err() {}})',
			options: checkPropertiesOptions,
			errors: createErrors('The property `err` should be named `error`. A more descriptive name will do too.'),
		},
		{
			code: '(class {err() {}})',
			options: checkPropertiesOptions,
			errors: createErrors('The property `err` should be named `error`. A more descriptive name will do too.'),
		},
		{
			code: 'this.errCbOptsObj = 1',
			options: checkPropertiesOptions,
			errors: createErrors('The property `errCbOptsObj` should be named `errorCallbackOptionsObject`. A more descriptive name will do too.'),
		},

		{
			code: 'let successCb',
			output: 'let successCallback',
			errors: 1,
		},
		{
			code: 'let btnColor',
			output: 'let buttonColor',
			errors: 1,
		},

		{
			code: 'this.successCb = 1',
			options: checkPropertiesOptions,
			errors: 1,
		},
		{
			code: 'this.btnColor = 1',
			options: checkPropertiesOptions,
			errors: 1,
		},

		// This tests that the rule does not hang up on combinatoric explosion of possible replacements
		{
			code: 'let ' + 'CbE'.repeat(1024),
			output: 'let ' + 'CallbackE'.repeat(1024),
			errors: 1,
		},

		{
			code: 'let evt',
			output: 'let event_',
			errors: createErrors('The variable `evt` should be named `event_`. A more descriptive name will do too.'),
		},
		{
			code: '({evt: 1})',
			options: checkPropertiesOptions,
			errors: createErrors('The property `evt` should be named `event`. A more descriptive name will do too.'),
		},
		{
			code: 'foo.evt = 1',
			options: checkPropertiesOptions,
			errors: createErrors('The property `evt` should be named `event`. A more descriptive name will do too.'),
		},

		// Testing that options apply
		{
			code: 'let args',
			output: 'let arguments_',
			errors: 1,
		},
		{
			code: 'let args',
			output: 'let arguments_',
			options: extendedOptions,
			errors: 1,
		},
		{
			code: 'let args',
			output: 'let arguments_',
			options: customOptions,
			errors: 1,
		},

		{
			code: 'let c',
			output: 'let custom',
			options: extendedOptions,
			errors: 1,
		},

		{
			code: 'function cb() {}',
			output: 'function callback() {}',
			errors: 1,
		},
		{
			code: 'class cb {}',
			output: 'class circuitBreacker {}',
			options: extendedOptions,
			errors: 1,
		},
		{
			code: 'let e',
			options: customOptions,
			errors: 1,
		},

		{
			code: 'let err',
			output: 'let error',
			options: extendedOptions,
			errors: 1,
		},
		{
			code: 'let err',
			output: 'let error',
			options: customOptions,
			errors: 1,
		},

		{
			code: 'let errCb',
			output: 'let errorCallback',
			errors: 1,
		},
		{
			code: 'let errCb',
			output: 'let errorCircuitBreacker',
			options: extendedOptions,
			errors: 1,
		},
		{
			code: 'let errCb',
			output: 'let handleError',
			options: customOptions,
			errors: 1,
		},
		{
			code: 'let ErrCb',
			output: 'let HandleError',
			options: customOptions,
			errors: 1,
		},
		{
			code: 'let ErrCb',
			output: 'let ErrorCircuitBreacker',
			options: extendedOptions,
			errors: 1,
		},

		// `errCb` should not match this
		{
			code: 'let fooErrCb',
			output: 'let fooErrorCb',
			options: customOptions,
			errors: 1,
		},
		{
			code: 'let errCbFoo',
			output: 'let errorCbFoo',
			options: customOptions,
			errors: 1,
		},

		{
			code: outdent`
				let e;
				console.log(e);
			`,
			errors: 1,
		},

		{
			code: outdent`
				let err;
				console.log(err);
			`,
			output: outdent`
				let error;
				console.log(error);
			`,
			errors: 1,
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
			errors: 1,
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
			errors: 1,
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
			errors: 1,
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
			errors: 1,
		},

		{
			code: 'err => err',
			output: 'error => error',
			errors: 1,
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
			errors: 1,
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
			errors: 1,
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
			errors: 1,
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
			errors: 1,
		},

		{
			code: '({err}) => err',
			output: '({err: error}) => error',
			options: customOptions,
			errors: 1,
		},
		{
			code: 'err => ({err})',
			output: 'error => ({err: error})',
			options: customOptions,
			errors: 1,
		},
		{
			code: 'const {err} = foo;',
			output: 'const {err: error} = foo;',
			options: customOptions,
			errors: 1,
		},

		{
			code: 'const foo = {err: 1}',
			options: checkPropertiesOptions,
			errors: 1,
		},
		{
			code: outdent`
				const foo = {
					err() {}
				};
			`,
			options: checkPropertiesOptions,
			errors: 1,
		},
		{
			code: 'foo.err = 1',
			options: checkPropertiesOptions,
			errors: 1,
		},
		{
			code: 'foo.bar.err = 1',
			options: checkPropertiesOptions,
			errors: 1,
		},

		{
			code: outdent`
				class C {
					err() {}
				}
			`,
			options: checkPropertiesOptions,
			errors: 1,
		},

		{
			code: 'this._err = 1',
			options: checkPropertiesOptions,
			errors: createErrors('The property `_err` should be named `_error`. A more descriptive name will do too.'),
		},
		{
			code: 'this.__err__ = 1',
			options: checkPropertiesOptions,
			errors: createErrors('The property `__err__` should be named `__error__`. A more descriptive name will do too.'),
		},
		{
			code: 'this.e_ = 1',
			options: checkPropertiesOptions,
			errors: createErrors('Please rename the property `e_`. Suggested names are: `error_`, `event_`. A more descriptive name will do too.'),
		},

		{
			code: 'let err_',
			output: 'let error_',
			errors: 1,
		},
		{
			code: 'let __err__',
			output: 'let __error__',
			errors: 1,
		},
		{
			code: 'let _e',
			errors: createErrors('Please rename the variable `_e`. Suggested names are: `_error`, `_event`. A more descriptive name will do too.'),
		},

		{
			code: 'class Err {}',
			output: 'class Error_ {}',
			errors: createErrors('The variable `Err` should be named `Error_`. A more descriptive name will do too.'),
		},
		{
			code: 'class Cb {}',
			output: 'class Callback {}',
			errors: createErrors('The variable `Cb` should be named `Callback`. A more descriptive name will do too.'),
		},
		{
			code: 'class Res {}',
			errors: createErrors('Please rename the variable `Res`. Suggested names are: `Resource`, `Response_`, `Result`. A more descriptive name will do too.'),
		},
		{
			code: 'const Err = 1;',
			output: 'const Error_ = 1;',
			errors: 1,
		},
		{
			code: 'const _Err_ = 1;',
			output: 'const _Error_ = 1;',
			errors: 1,
		},
		{
			code: '({Err: 1})',
			options: checkPropertiesOptions,
			errors: createErrors('The property `Err` should be named `Error`. A more descriptive name will do too.'),
		},
		{
			code: '({Res: 1})',
			options: checkPropertiesOptions,
			errors: createErrors('Please rename the property `Res`. Suggested names are: `Resource`, `Response`, `Result`. A more descriptive name will do too.'),
		},

		{
			code: 'let doc',
			output: 'let document_',
			errors: 1,
		},

		// This test need run eslint 3 times to get the correct result
		{
			code: outdent`
				function fn() {
					for (let i = 0; i<10; i++) {
						for (let j = 0; j<10; j++) {
							console.log(i, j)
						}
					}
				}
				const func = fn;
			`,
			output: outdent`
				function function_() {
					for (let i = 0; i<10; i++) {
						for (let j = 0; j<10; j++) {
							console.log(i, j)
						}
					}
				}
				const func = function_;
			`,
			errors: [
				...createErrors('The variable `fn` should be named `function_`. A more descriptive name will do too.'),
				...createErrors('The variable `i` should be named `index`. A more descriptive name will do too.'),
				...createErrors('The variable `j` should be named `index_`. A more descriptive name will do too.'),
				...createErrors('The variable `func` should be named `function__`. A more descriptive name will do too.'),
			],
		},
		{
			code: outdent`
				function function_() {
					for (let i = 0; i<10; i++) {
						for (let j = 0; j<10; j++) {
							console.log(i, j)
						}
					}
				}
				const func = function_;
			`,
			output: outdent`
				function function_() {
					for (let index = 0; index<10; index++) {
						for (let j = 0; j<10; j++) {
							console.log(index, j)
						}
					}
				}
				const function__ = function_;
			`,
			errors: [
				...createErrors('The variable `i` should be named `index`. A more descriptive name will do too.'),
				...createErrors('The variable `j` should be named `index_`. A more descriptive name will do too.'),
				...createErrors('The variable `func` should be named `function__`. A more descriptive name will do too.'),
			],
		},
		{
			code: outdent`
				function function_() {
					for (let index = 0; index<10; index++) {
						for (let j = 0; j<10; j++) {
							console.log(index, j)
						}
					}
				}
				const function__ = function_;
			`,
			output: outdent`
				function function_() {
					for (let index = 0; index<10; index++) {
						for (let index_ = 0; index_<10; index_++) {
							console.log(index, index_)
						}
					}
				}
				const function__ = function_;
			`,
			errors: createErrors('The variable `j` should be named `index_`. A more descriptive name will do too.'),
		},

		// `package` is a reserved word in strict mode
		{
			code: 'let pkg',
			output: 'let package_',
			errors: 1,
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
			errors: createErrors('The variable `pkg` should be named `package_`. A more descriptive name will do too.'),
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
			errors: createErrors('The variable `pkg` should be named `package__`. A more descriptive name will do too.'),
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
				...createErrors('The variable `pkg` should be named `package_`. A more descriptive name will do too.'),
			],
		},

		{
			code: 'let y',
			output: 'let yield_',
			options: customOptions,
			errors: 1,
		},

		{
			code: 'let errCb, errorCb',
			output: 'let errorCallback, errorCallback_',
			errors: 2,
		},
		{
			code: '{ let errCb }; { let errorCb }',
			output: '{ let errorCallback }; { let errorCallback }',
			errors: 2,
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
			errors: 1.concat(1)
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
			errors: 2,
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
			errors: 1,
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
			errors: 1,
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
			errors: 1,
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
			errors: 1,
		},

		{
			code: outdent`
				const f = (...args) => {
					return args;
				}
			`,
			output: outdent`
				const f = (...arguments_) => {
					return arguments_;
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				let args;
				const f = () => {
					return args;
				}
			`,
			output: outdent`
				let arguments_;
				const f = () => {
					return arguments_;
				}
			`,
			errors: 1,
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
			errors: 1,
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
			errors: 1,
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
			errors: 1,
		},
		{
			code: outdent`
				function unicorn (unicorn) {
					const {prop = {}} = unicorn;
					return property;
				}
			`,
			output: outdent`
				function unicorn (unicorn) {
					const {prop: property_ = {}} = unicorn;
					return property;
				}
			`,
			errors: 1,
		},

		{
			code: 'const {prop} = {};',
			output: 'const {prop: property} = {};',
			options: [{checkShorthandProperties: true}],
			errors: 1,
		},
		{
			code: 'const [prop] = [];',
			output: 'const [property] = [];',
			errors: 1,
		},
		{
			code: 'const {prop: prop} = {};',
			output: 'const {prop: property} = {};',
			errors: 1,
		},
		{
			code: 'const {prop = 1} = {};',
			output: 'const {prop: property = 1} = {};',
			errors: 1,
		},
		{
			code: 'const [prop = 1] = [];',
			output: 'const [property = 1] = [];',
			errors: 1,
		},
		{
			code: 'const {prop: prop = 1} = {};',
			output: 'const {prop: property = 1} = {};',
			errors: 1,
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
			errors: 1,
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
			errors: 1,
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
			errors: 1,
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
			errors: 1,
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
			errors: 1,
		},

		// `extendDefaultAllowList` option
		{
			code: 'const propTypes = 2;const err = 2;',
			output: 'const propertyTypes = 2;const err = 2;',
			options: noExtendDefaultAllowListOptions,
			errors: 1,
		},

		// #1937
		{
			code: 'const expectedRetVal = "that should be ok";',
			output: 'const expectedReturnValue = "that should be ok";',
			errors: 1,
		},
		{
			code: 'const retVal = "that should be ok";',
			output: 'const returnValue = "that should be ok";',
			errors: 1,
		},
		{
			code: 'const retValue = "that should be ok";',
			output: 'const returnValue = "that should be ok";',
			errors: 1,
		},
		{
			code: 'const returnVal = "that should be ok";',
			output: 'const returnValue = "that should be ok";',
			errors: 1,
		},
		{
			code: 'const sendDmMessage = () => {};',
			output: 'const sendDirectMessage = () => {};',
			options: [{replacements: {dm: {directMessage: true}}}],
			errors: 1,
		},
		{
			code: 'const ret_val = "that should be ok";',
			output: 'const returnValue_value = "that should be ok";',
			errors: 1,
		},
	],
};

test(tests);
test.babel(avoidTestTitleConflict(tests, 'babel'));
test.typescript(avoidTestTitleConflict(tests, 'typescript'));

test({
	testerOptions: {
		languageOptions: {
			sourceType: 'script',
			ecmaVersion: 5,
			globals: {
				document: 'readonly',
				event: 'readonly',
			},
		},
	},
	valid: [],
	invalid: [
		{
			code: 'var doc',
			output: 'var document_',
			errors: 1,
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
			errors: 1,
		},

		{
			code: 'var y',
			output: 'var yield_',
			options: customOptions,
			errors: 1,
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
			errors: 1,
		},
		{
			code: 'function a() {try {} catch(args) {}}',
			output: 'function a() {try {} catch(arguments_) {}}',
			options: customOptions,
			errors: 1,
		},
		{
			code: 'var one',
			options: [{replacements: {one: {1: true}}}],
			errors: 1,
		},
		{
			code: 'var one_two',
			options: [{replacements: {one: {first: true, 1: true}}}],
			errors: 1,
		},
	],
});

const importExportTests = {
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
			options: noCheckDefaultAndNamespaceImports,
		},
		{
			code: 'const err = require("./err")',
			options: noCheckDefaultAndNamespaceImports,
		},
		{
			code: 'import foo, * as err from "err"',
			options: noCheckDefaultAndNamespaceImports,
		},
		{
			code: 'import foo, * as err from "./err"',
			options: noCheckDefaultAndNamespaceImports,
		},
		{
			code: 'import { default as err, foo as bar } from "err"',
			options: noCheckDefaultAndNamespaceImports,
		},
		{
			code: 'import { default as err, foo as bar } from "./err"',
			options: noCheckDefaultAndNamespaceImports,
		},
		{
			code: 'import err, { foo as bar } from "err"',
			options: noCheckDefaultAndNamespaceImports,
		},
		{
			code: 'import err, { foo as bar } from "./err"',
			options: noCheckDefaultAndNamespaceImports,
		},
		{
			code: 'import * as err from "err"',
			options: noCheckDefaultAndNamespaceImports,
		},
		{
			code: 'import * as err from "./err"',
			options: noCheckDefaultAndNamespaceImports,
		},
		{
			code: 'import err from "err"',
			options: noCheckDefaultAndNamespaceImports,
		},
		{
			code: 'import err from "./err"',
			options: noCheckDefaultAndNamespaceImports,
		},

		// Option checkShorthandImports: false
		{
			code: 'import { err } from "err"',
			options: noCheckShorthandImportsOptions,
		},
		{
			code: 'import { err } from "./err"',
			options: noCheckShorthandImportsOptions,
		},
		{
			code: 'import { default as foo, err } from "err"',
			options: noCheckShorthandImportsOptions,
		},
		{
			code: 'import { default as foo, err } from "./err"',
			options: noCheckShorthandImportsOptions,
		},
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
			errors: 1,
		},
		{
			code: outdent`
				import {err} from 'err';
			`,
			output: outdent`
				import {err as error} from 'err';
			`,
			options: customOptions,
			errors: 1,
		},
		{
			code: 'import {err as err} from "err";',
			output: 'import {err as error} from "err";',
			options: customOptions,
			errors: 1,
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
			errors: 1,
		},

		{
			code: outdent`
				import {err as cb} from 'err';
			`,
			output: outdent`
				import {err as callback} from 'err';
			`,
			errors: 1,
		},
		{
			code: outdent`
				const {err: cb} = foo;
			`,
			output: outdent`
				const {err: callback} = foo;
			`,
			errors: 1,
		},

		// Internal import
		{
			code: 'const err = require("../err")',
			output: 'const error = require("../err")',
			errors: 1,
		},
		{
			code: 'const err = require("/err")',
			output: 'const error = require("/err")',
			errors: 1,
		},
		{
			code: 'import err from "./err"',
			output: 'import error from "./err"',
			errors: 1,
		},
		{
			code: 'import err, {foo as bar} from "./err"',
			output: 'import error, {foo as bar} from "./err"',
			errors: 1,
		},
		{
			code: 'import {default as err, foo as bar} from "./err"',
			output: 'import {default as error, foo as bar} from "./err"',
			errors: 1,
		},
		{
			code: 'import * as err from "./err"',
			output: 'import * as error from "./err"',
			errors: 1,
		},
		{
			code: 'import foo, * as err from "./err"',
			output: 'import foo, * as error from "./err"',
			errors: 1,
		},
		{
			code: 'import {err} from "./err"',
			output: 'import {err as error} from "./err"',
			errors: 1,
		},
		{
			code: 'import {default as foo, err} from "./err"',
			output: 'import {default as foo, err as error} from "./err"',
			errors: 1,
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
			errors: 1,
		},

		{
			code: outdent`
				let err;
				export {err as err};
			`,
			output: outdent`
				let error;
				export {error as err};
			`,
			errors: 1,
		},

		{
			code: 'export const err = {}',
			errors: 1,
		},
		{
			code: 'export let err',
			errors: 1,
		},
		{
			code: 'export var err',
			errors: 1,
		},
		{
			code: 'export function err() {}',
			errors: 1,
		},
		{
			code: 'export class err {}',
			errors: 1,
		},

		{
			code: outdent`
				const err = {};
				export const error = err;
			`,
			output: outdent`
				const error_ = {};
				export const error = error_;
			`,
			errors: 1,
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
			errors: 1,
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
			errors: 1,
		},

		{
			code: outdent`
				let foo;
				export {foo as err};
			`,
			options: checkPropertiesOptions,
			errors: 1,
		},

	],
};
test(importExportTests);
test.babel(avoidTestTitleConflict(importExportTests, 'babel'));
test.typescript(avoidTestTitleConflict(importExportTests, 'typescript'));

test.babel({
	valid: [
		// Allowed names
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
		`,
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
			errors: 1,
		},
		{
			code: '({err}) => err;',
			output: '({err: error}) => error;',
			options: customOptions,
			errors: 1,
		},
		{
			code: 'err => ({err});',
			output: 'error => ({err: error});',
			options: customOptions,
			errors: 1,
		},
		{
			code: 'Foo.customProps = {}',
			options: checkPropertiesOptions,
			errors: 1,
		},
		{
			code: outdent`
				class Foo {
					static propTypesAndStuff = {};
				}
			`,
			options: checkPropertiesOptions,
			errors: 1,
		},
		{
			code: outdent`
				class Foo {
					static getDerivedContextFromProps() {}
				}
			`,
			options: checkPropertiesOptions,
			errors: 1,
		},

		{
			code: '(class {e = 1})',
			options: checkPropertiesOptions,
			errors: createErrors('Please rename the property `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.'),
		},
		{
			code: '(class {err = 1})',
			options: checkPropertiesOptions,
			errors: createErrors('The property `err` should be named `error`. A more descriptive name will do too.'),
		},
		{
			code: outdent`
				class C {
					err = () => {}
				}
			`,
			options: checkPropertiesOptions,
			errors: 1,
		},
	],
});

test.typescript({
	testerOptions: {
		languageOptions: {
			globals: {
				document: 'readonly',
				event: 'readonly',
				Response: 'readonly',
			},
		},
	},
	valid: [],
	invalid: [
		// Types
		...[
			'declare const prop: string;',
			'declare var prop: number;',
			'declare let prop: any;',
			'declare class prop {}',
			'const prop: SomeThing<boolean> = func();',
		].map(code => ({
			code,
			output: code.replace('prop', 'property'),
			errors: 1,
		})),

		// #763
		{
			code: 'const foo = (extraParams?: string) => {}',
			output: 'const foo = (extraParameters?: string) => {}',
			errors: 1,
		},
		{
			code: 'const foo = (extr\u0061Params     ?    :    string) => {}',
			output: 'const foo = (extraParameters?:    string) => {}',
			errors: 1,
		},

		// #912
		{
			code: outdent`
				interface Prop {
						id: number;
				}

				const Prop: Prop = { id: 1 };

				export default Prop;
			`,
			output: outdent`
				interface Property {
						id: number;
				}

				const Property: Property = { id: 1 };

				export default Property;
			`,
			errors: 1,
		},

		// #1102
		{
			code: 'export type Props = string',
			errors: 1,
		},

		// #347
		{
			code: outdent`
				function onKeyDown(e: KeyboardEvent) {
					if (e.keyCode) {}
				}
			`,
			output: outdent`
				function onKeyDown(event_: KeyboardEvent) {
					if (event_.keyCode) {}
				}
			`,
			options: [
				{
					extendDefaultReplacements: false,
					replacements: {
						e: {
							event: true,
						},
					},
				},
			],
			errors: 1,
		},

		// https://github.com/facebook/relay/blob/597d2a17aa29d401830407b6814a5f8d148f632d/packages/relay-experimental/EntryPointTypes.flow.js#L138
		{
			code: outdent`
				export type PreloadProps<TExtraProps = null> = {}
			`,
			output: outdent`
				export type PreloadProps<TExtraProperties = null> = {}
			`,
			errors: 2,
		},

		// https://github.com/facebook/relay/blob/597d2a17aa29d401830407b6814a5f8d148f632d/packages/relay-experimental/EntryPointTypes.flow.js#L138
		{
			code: outdent`
				export type PreloadProps<TExtraProps = null> = {};
			`,
			output: outdent`
				export type PreloadProps<TExtraProperties = null> = {};
			`,
			errors: 2,
		},
	],
});

// JSX
test.typescript({
	testerOptions: {
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
	},
	valid: [],
	invalid: [
		// https://github.com/microsoft/fluentui/blob/ead191a8368bf64ecabffce5ea0e02565f449a95/packages/fluentui/docs/src/views/FocusTrapZoneDoc.tsx#L10
		{
			code: outdent`
				import DocPage from '../components/DocPage';
				export default () => (
					<DocPage title="Focus Trap Zone"></DocPage>
				);
			`,
			errors: 1,
		},
	],
});

// Filename
test({
	valid: [
		{
			code: 'foo();',
			filename: 'http-error.js',
		},
		{
			code: 'foo();',
			filename: 'http-err.js',
			options: [{checkFilenames: false}],
		},
		{
			code: 'foo();',
			filename: 'err/http-error.js',
		},
		{
			code: 'foo();',
			filename: 'Мiръ.html',
		},
		// `ignore` option
		{
			code: outdent`
				const e_at_start = 1;
				const end_with_e = 2;
			`,
			filename: 'some.spec.e2e.test.js',
			options: [
				{
					ignore: [
						/^e_/,
						// eslint-disable-next-line prefer-regex-literals
						new RegExp('_e$', 'i'),
						String.raw`\.e2e\.`,
					],
				},
			],
		},
	],
	invalid: [
		{
			code: 'foo();',
			filename: 'err/http-err.js',
			errors: 1,
		},
		{
			code: 'foo();',
			filename: 'http-err.js',
			errors: 1,
		},
		{
			code: 'foo();',
			filename: '/path/to/doc/__prev-Attr$1Err__.conf.js',
			errors: createErrors('The filename `__prev-Attr$1Err__.conf.js` should be named `__previous-Attribute$1Error__.config.js`. A more descriptive name will do too.'),
		},
		{
			code: 'foo();',
			filename: '.http.err.js',
			errors: createErrors('The filename `.http.err.js` should be named `.http.error.js`. A more descriptive name will do too.'),
		},
		{
			code: 'foo();',
			filename: 'e.js',
			errors: createErrors('Please rename the filename `e.js`. Suggested names are: `error.js`, `event.js`. A more descriptive name will do too.'),
		},
		{
			code: 'foo();',
			filename: 'c.js',
			options: extendedOptions,
			errors: createErrors('The filename `c.js` should be named `custom.js`. A more descriptive name will do too.'),
		},
		{
			code: 'foo();',
			filename: 'cb.js',
			options: extendedOptions,
			errors: createErrors('The filename `cb.js` should be named `circuitBreacker.js`. A more descriptive name will do too.'),
		},
		// `ignore` option
		{
			code: outdent`
				const e_at_start = 1;
				const end_with_e = 2;
			`,
			filename: 'some.spec.e2e.test.js',
			errors: [
				...createErrors('Please rename the filename `some.spec.e2e.test.js`. Suggested names are: `some.spec.error2error.test.js`, `some.spec.error2event.test.js`, `some.spec.event2error.test.js`, ... (1 more omitted). A more descriptive name will do too.'),
				...createErrors('Please rename the variable `e_at_start`. Suggested names are: `error_at_start`, `event_at_start`. A more descriptive name will do too.'),
				...createErrors('Please rename the variable `end_with_e`. Suggested names are: `end_with_error`, `end_with_event`. A more descriptive name will do too.'),
			],
		},
	],
});

test.vue({
	valid: [],
	invalid: [
		{
			code: outdent`
				<template>
					<button @click="goToPrev"/>
				</template>
				<script setup>
				const goToPrev = () => {}
				</script>
			`,
			errors: 1,
		},
		{
			code: outdent`
				<template><button/></template>
				<script setup>
				const goToPrev = () => {}
				</script>
			`,
			output: outdent`
				<template><button/></template>
				<script setup>
				const goToPrevious = () => {}
				</script>
			`,
			errors: 1,
		},
	],
});
