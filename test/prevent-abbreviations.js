import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
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
		ecmaVersion: 2019,
		sourceType: 'module'
	}
});

const babelRuleTester = avaRuleTester(test, {
	parser: 'babel-eslint'
});

const noFixingTestCase = test => ({...test, output: test.code});

const createErrors = message => {
	const error = {
		ruleId: 'prevent-abbreviations'
	};

	if (message) {
		error.message = message;
	}

	return [error];
};

const extendedOptions = [{
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
}];

const customOptions = [{
	checkProperties: false,

	checkDefaultAndNamespaceImports: true,
	checkShorthandImports: true,
	checkShorthandProperties: true,

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
}];

const dontCheckVariablesOptions = [{
	checkVariables: false
}];

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
		`
			(class {
				error() {}
			})
		`,
		`
			(class {
				[err]() {}
			})
		`,
		`
			class C {
				x() {}
			}
		`,
		'foo.error',
		'foo.x',
		'let E',
		'let NODE_ENV',

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
			code: '({err: 1})',
			options: customOptions
		},

		{
			code: 'let err',
			options: dontCheckVariablesOptions
		},

		{
			code: '({__proto__: null})',
			options: customOptions
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
			errors: createErrors('Please rename the property `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: 'this.e = 1',
			errors: createErrors('Please rename the property `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: '({e() {}})',
			errors: createErrors('Please rename the property `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: '(class {e() {}})',
			errors: createErrors('Please rename the property `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: 'this.eResDir = 1',
			errors: createErrors('Please rename the property `eResDir`. Suggested names are: `errorResponseDirectory`, `errorResultDirectory`, `eventResponseDirectory`, ... (1 more omitted). A more descriptive name will do too.')
		}),

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
		noFixingTestCase({
			code: '({err: 1})',
			errors: createErrors('The property `err` should be named `error`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: 'this.err = 1',
			errors: createErrors('The property `err` should be named `error`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: '({err() {}})',
			errors: createErrors('The property `err` should be named `error`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: '(class {err() {}})',
			errors: createErrors('The property `err` should be named `error`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: 'this.errCbOptsObj = 1',
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
			errors: createErrors()
		}),
		noFixingTestCase({
			code: 'this.btnColor = 1',
			errors: createErrors()
		}),

		// This tests that the rule does not hang up on combinatoric explosion of possible replacements
		{
			code: 'let ' + 'CbE'.repeat(1024),
			errors: createErrors()
		},

		{
			code: 'let evt',
			errors: createErrors('The variable `evt` should be named `event`. A more descriptive name will do too.')
		},
		noFixingTestCase({
			code: '({evt: 1})',
			errors: createErrors('The property `evt` should be named `event`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: 'foo.evt = 1',
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
			errors: createErrors()
		}),
		noFixingTestCase({
			code: '({err: 1})',
			options: extendedOptions,
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
			code: '({err: 1})',
			options: dontCheckVariablesOptions,
			errors: createErrors()
		}),

		noFixingTestCase({
			code: `
				let e;
				console.log(e);
			`,
			errors: createErrors()
		}),

		{
			code: `
				let err;
				console.log(err);
			`,
			output: `
				let error;
				console.log(error);
			`,
			errors: createErrors()
		},

		{
			code: `
				let error;
				{
					let err;
				}
			`,
			output: `
				let error;
				{
					let error_;
				}
			`,
			errors: createErrors()
		},
		{
			code: `
				let error;
				let error_;
				{
					let err;
				}
			`,
			output: `
				let error;
				let error_;
				{
					let error__;
				}
			`,
			errors: createErrors()
		},
		{
			code: `
				let error;
				{
					let err;
					console.log(error);
				}
			`,
			output: `
				let error;
				{
					let error_;
					console.log(error);
				}
			`,
			errors: createErrors()
		},
		{
			code: `
				let error;
				{
					let err;
					console.log(error, err);
				}
			`,
			output: `
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
			code: `
				const opts = {};
				console.log(opts);
			`,
			output: `
				const options = {};
				console.log(options);
			`,
			errors: createErrors()
		},
		{
			code: `
				var opts = 1;
				var opts = 2;
				console.log(opts);
			`,
			output: `
				var options = 1;
				var options = 2;
				console.log(options);
			`,
			errors: createErrors()
		},

		{
			code: `
				const err = {};
				const foo = {err};
			`,
			output: `
				const error = {};
				const foo = {err: error};
			`,
			errors: createErrors()
		},
		{
			code: `
				const err = {};
				const foo = {
					a: 1,
					err,
					b: 2
				};
			`,
			output: `
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
			code: 'const {err} = foo;',
			output: 'const {err: error} = foo;',
			options: customOptions,
			errors: createErrors()
		},

		noFixingTestCase({
			code: 'const foo = {err: 1}',
			errors: createErrors()
		}),
		noFixingTestCase({
			code: `
				const foo = {
					err() {}
				};
			`,
			errors: createErrors()
		}),
		noFixingTestCase({
			code: 'foo.err = 1',
			errors: createErrors()
		}),
		noFixingTestCase({
			code: 'foo.bar.err = 1',
			errors: createErrors()
		}),
		noFixingTestCase({
			code: 'this.err = 1',
			errors: createErrors()
		}),

		noFixingTestCase({
			code: `
				class C {
					err() {}
				}
			`,
			errors: createErrors()
		}),

		noFixingTestCase({
			code: 'this._err = 1',
			errors: createErrors('The property `_err` should be named `_error`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: 'this.__err__ = 1',
			errors: createErrors('The property `__err__` should be named `__error__`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: 'this.e_ = 1',
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
			errors: createErrors('The variable `Err` should be named `Error`. A more descriptive name will do too.')
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
			errors: createErrors('The property `Err` should be named `Error`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: '({Res: 1})',
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
			code: `
				"use strict";
				let pkg;
			`,
			output: `
				"use strict";
				let package_;
			`,
			errors: createErrors()
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
			code: `
				let errCb;
				{
					let errorCb;
					console.log(errCb, errorCb);
				}
			`,
			output: `
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
			code: `
				let errCb;
				{
					let errorCb;
					console.log(errCb, errorCb);
				}
			`,
			output: `
				let errorCallback;
				{
					let errorCb;
					console.log(errorCallback, errorCb);
				}
			`,
			errors: createErrors().concat(createErrors())
		},

		{
			code: `
				let err;
				({a: err = 1} = 2);
			`,
			output: `
				let error;
				({a: error = 1} = 2);
			`,
			errors: createErrors()
		},

		// Renaming to `arguments` would result in a `SyntaxError`, so it should rename to `arguments_`
		{
			code: `
				'use strict';
				let args;
			`,
			output: `
				'use strict';
				let arguments_;
			`,
			errors: createErrors()
		},
		{
			code: `
				class A {
					method(...args) {
						return super.method(...args) + 1;
					}
				}
			`,
			output: `
				class A {
					method(...arguments_) {
						return super.method(...arguments_) + 1;
					}
				}
			`,
			errors: createErrors()
		},
		{
			code: `
				class A extends B {
					constructor(...args) {
						super(...args);
					}
				}
			`,
			output: `
				class A extends B {
					constructor(...arguments_) {
						super(...arguments_);
					}
				}
			`,
			errors: createErrors()
		},

		{
			code: `
				const f = (...args) => {
					return args;
				}
			`,
			output: `
				const f = (...arguments) => {
					return arguments;
				}
			`,
			errors: createErrors()
		},
		{
			code: `
				let args;
				const f = () => {
					return args;
				}
			`,
			output: `
				let arguments;
				const f = () => {
					return arguments;
				}
			`,
			errors: createErrors()
		},

		// Renaming to `arguments` whould result in `f` returning it's arguments instead of the outer variable
		{
			code: `
				let args;
				function f() {
					return args;
				}
			`,
			output: `
				let arguments_;
				function f() {
					return arguments_;
				}
			`,
			errors: createErrors()
		},
		{
			code: `
				let args;
				function f() {
					return arguments + args;
				}
			`,
			output: `
				let arguments_;
				function f() {
					return arguments + arguments_;
				}
			`,
			errors: createErrors()
		},
		{
			code: `
				let args;
				function f() {
					return g.apply(this, arguments) + args;
				}
			`,
			output: `
				let arguments_;
				function f() {
					return g.apply(this, arguments) + arguments_;
				}
			`,
			errors: createErrors()
		},

		{
			code: `
				function unicorn(unicorn) {
					const {docs = {}} = unicorn;
					return docs;
				}
			`,
			output: `
				function unicorn(unicorn) {
					const {docs: documents = {}} = unicorn;
					return documents;
				}
			`,
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
			code: `
				var doc;
				document.querySelector(doc);
			`,
			output: `
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
			code: `
				"use strict";
				var y;
			`,
			output: `
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
		'function f({err}) {}'
	],

	invalid: [
		{
			code: `
				import err from 'err';
			`,
			output: `
				import error from 'err';
			`,
			options: customOptions,
			errors: createErrors()
		},
		{
			code: `
				import {err} from 'err';
			`,
			output: `
				import {err as error} from 'err';
			`,
			options: customOptions,
			errors: createErrors()
		},
		{
			code: `
				import {
					bar,
					err,
					buz,
				} from 'foo';
			`,
			output: `
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
			code: `
				import {err as cb} from 'err';
			`,
			output: `
				import {err as callback} from 'err';
			`,
			errors: createErrors()
		},
		{
			code: `
				const {err: cb} = foo;
			`,
			output: `
				const {err: callback} = foo;
			`,
			errors: createErrors()
		},

		{
			code: `
				let err;
				export {err};
			`,
			output: `
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
			code: `
				const err = {};
				export const error = err;
			`,
			output: `
				const error_ = {};
				export const error = error_;
			`,
			errors: createErrors()
		},

		{
			code: `
				class err {};
				console.log(err);
			`,
			output: `
				class error {};
				console.log(error);
			`,
			errors: createErrors()
		},

		{
			code: `
				class err {
					constructor() {
						console.log(err);
					}
				};
				console.log(err);
			`,
			output: `
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
			code: `
				let foo;
				export {foo as err};
			`,
			errors: createErrors()
		})
	]
});

babelRuleTester.run('prevent-abbreviations', rule, {
	valid: [
		// Whitelisted names
		'Foo.defaultProps = {}',
		`class Foo {
			static propTypes = {};
			static getDerivedStateFromProps() {}
		}`
	],

	invalid: [
		{
			code: 'Foo.customProps = {}',
			errors: createErrors()
		},
		{
			code: `
				class Foo {
					static propTypesAndStuff = {};
				}
			`,
			errors: createErrors()
		},
		{
			code: `
				class Foo {
					static getDerivedContextFromProps() {}
				}
			`,
			errors: createErrors()
		},

		noFixingTestCase({
			code: '(class {e = 1})',
			errors: createErrors('Please rename the property `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: '(class {err = 1})',
			errors: createErrors('The property `err` should be named `error`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: `
				class C {
					err = () => {}
				}
			`,
			errors: createErrors()
		})
	]
});
