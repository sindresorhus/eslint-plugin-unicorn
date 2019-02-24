import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prevent-abbreviations';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const moduleRuleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const babelRuleTester = avaRuleTester(test, {
	parser: 'babel-eslint'
});

const noFixingTestCase = test => Object.assign({}, test, {
	output: test.code
});

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
	matchPascalCase: false,
	checkPropertyNames: false,
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
		Err: {
			Errand: true
		}
	}
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
			code: 'let E',
			options: customOptions
		},
		{
			code: 'let E',
			options: extendedOptions
		},

		// Renaming to `arguments` would result in a `SyntaxError`, so it should keep `args`
		`
			'use strict';
			let args;
		`,
		`
			class A {
				method(...args) {
					return super.method(...args) + 1;
				}
			}
		`,
		`
			class A extends B {
				constructor(...args) {
					super(...args);
				}
			}
		`,

		// TODO: This could be renamed to `arguments` safely in non-strict mode,
		// but it is currently impractical due to a suspected bug in `eslint-scope`.
		// https://github.com/eslint/eslint-scope/issues/49
		`
			const f = (...args) => {
				return args;
			}
		`,
		`
			let args;
			const f = () => {
				return args;
			}
		`,

		// Renaming to `arguments` whould result in `f` returning it's arguments instead of the outer variable
		`
			let args;
			function f() {
				return args;
			}
		`,

		`
			let args;
			function f() {
				return arguments + args;
			}
		`,

		`
			let args;
			function f() {
				return g.apply(this, arguments) + args;
			}
		`
	],

	invalid: [
		noFixingTestCase({
			code: 'let e',
			errors: createErrors('Please rename the variable `e`. Suggested names are: `error`, `event`. A more descriptive name will do too.')
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

		{
			code: 'let err',
			output: 'let error',
			errors: createErrors('The variable `err` should be named `error`. A more descriptive name will do too.')
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

		{
			code: 'let e',
			output: 'let e',
			errors: createErrors()
		},
		{
			code: 'let e',
			output: 'let e',
			options: customOptions,
			errors: createErrors()
		},

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

		noFixingTestCase({
			code: 'let E',
			errors: createErrors()
		}),

		{
			code: 'class Err {}',
			output: 'class Error_ {}',
			errors: createErrors()
		},
		{
			code: 'class Err {}',
			output: 'class Error_ {}',
			options: extendedOptions,
			errors: createErrors()
		},
		{
			code: 'class Err {}',
			output: 'class Errand {}',
			options: customOptions,
			errors: createErrors()
		},

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
			errors: createErrors('The property `_err` should be named `error`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: 'this.__err__ = 1',
			errors: createErrors()
		}),
		noFixingTestCase({
			code: 'this.e_ = 1',
			errors: createErrors()
		}),

		{
			code: 'let err_',
			output: 'let error',
			errors: createErrors('The variable `err_` should be named `error`. A more descriptive name will do too.')
		},
		{
			code: 'let __err__',
			output: 'let error',
			errors: createErrors()
		},
		noFixingTestCase({
			code: 'let _e',
			errors: createErrors()
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
			code: 'class E {}',
			errors: createErrors('Please rename the variable `E`. Suggested names are: `Error`, `Event`. A more descriptive name will do too.')
		}),
		{
			code: 'const Err = 1;',
			output: 'const Error_ = 1;',
			errors: createErrors()
		},
		{
			code: 'const _Err_ = 1;',
			output: 'const Error_ = 1;',
			errors: createErrors()
		},
		noFixingTestCase({
			code: '({Err: 1})',
			errors: createErrors('The property `Err` should be named `Error`. A more descriptive name will do too.')
		}),
		noFixingTestCase({
			code: '({E: 1})',
			errors: createErrors('Please rename the property `E`. Suggested names are: `Error`, `Event`. A more descriptive name will do too.')
		})
	]
});

moduleRuleTester.run('prevent-abbreviations', rule, {
	valid: [
		'import {err as foo} from "foo"'
	],

	invalid: [
		{
			code: `
				import err from 'err';
			`,
			output: `
				import error from 'err';
			`,
			errors: createErrors()
		},
		{
			code: `
				import {err} from 'err';
			`,
			output: `
				import {err as error} from 'err';
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
	valid: [],

	invalid: [
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
