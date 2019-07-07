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
		ecmaVersion: 2019,
		sourceType: 'module'
	}
});

const babelRuleTester = avaRuleTester(test, {
	parser: require.resolve('babel-eslint')
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

const anotherNameMessage = 'A more descriptive name will do too.';

const formatMessage = (discouragedName, replacements, nameTypeText, replacementsLimit = 3) => {
	replacements = replacements.sort();

	const message = [];

	if (replacements.length === 1) {
		message.push(`The ${nameTypeText} \`${discouragedName}\` should be named \`${replacements[0]}\`.`);
	} else {
		let replacementsText = replacements.slice(0, replacementsLimit)
			.map(replacement => `\`${replacement}\``)
			.join(', ');

		const omittedReplacementsCount = replacements.length - replacementsLimit;
		if (omittedReplacementsCount > 0) {
			replacementsText += `, ... (${omittedReplacementsCount} more omitted)`;
		}

		message.push(`Please rename the ${nameTypeText} \`${discouragedName}\`.`);
		message.push(`Suggested names are: ${replacementsText}.`);
	}

	message.push(anotherNameMessage);

	return message.join(' ');
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
		}
	],

	invalid: [
		noFixingTestCase({
			code: 'let e',
			errors: createErrors(formatMessage('e', ['event', 'error'], 'variable'))
		}),
		noFixingTestCase({
			code: 'let eCbOpts',
			errors: createErrors(formatMessage('eCbOpts', ['errorCallbackOptions', 'eventCallbackOptions'], 'variable'))
		}),
		noFixingTestCase({
			code: '({e: 1})',
			errors: createErrors(formatMessage('e', ['event', 'error'], 'property'))
		}),
		noFixingTestCase({
			code: 'this.e = 1',
			errors: createErrors(formatMessage('e', ['event', 'error'], 'property'))
		}),
		noFixingTestCase({
			code: '({e() {}})',
			errors: createErrors(formatMessage('e', ['event', 'error'], 'property'))
		}),
		noFixingTestCase({
			code: '(class {e() {}})',
			errors: createErrors(formatMessage('e', ['event', 'error'], 'property'))
		}),
		noFixingTestCase({
			code: 'this.eResDir = 1',
			errors: createErrors(formatMessage('eResDir', ['errorResponseDirectory', 'errorResultDirectory', 'eventResponseDirectory', 'eventResultDirectory'], 'property'))
		}),
		{
			code: 'let err',
			output: 'let error',
			errors: createErrors(formatMessage('err', ['error'], 'variable'))
		},
		{
			code: 'let errCbOptsObj',
			output: 'let errorCallbackOptionsObject',
			errors: createErrors(formatMessage('errCbOptsObj', ['errorCallbackOptionsObject'], 'variable'))
		},
		noFixingTestCase({
			code: '({err: 1})',
			errors: createErrors(formatMessage('err', ['error'], 'property'))
		}),
		noFixingTestCase({
			code: 'this.err = 1',
			errors: createErrors(formatMessage('err', ['error'], 'property'))
		}),
		noFixingTestCase({
			code: '({err() {}})',
			errors: createErrors(formatMessage('err', ['error'], 'property'))
		}),
		noFixingTestCase({
			code: '(class {err() {}})',
			errors: createErrors(formatMessage('err', ['error'], 'property'))
		}),
		noFixingTestCase({
			code: 'this.errCbOptsObj = 1',
			errors: createErrors(formatMessage('errCbOptsObj', ['errorCallbackOptionsObject'], 'property'))
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
			errors: createErrors(formatMessage('evt', ['event'], 'variable'))
		},
		noFixingTestCase({
			code: '({evt: 1})',
			errors: createErrors(formatMessage('evt', ['event'], 'property'))
		}),
		noFixingTestCase({
			code: 'foo.evt = 1',
			errors: createErrors(formatMessage('evt', ['event'], 'property'))
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
			code: outdent`
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
			code: outdent`
				class C {
					err() {}
				}
			`,
			errors: createErrors()
		}),

		noFixingTestCase({
			code: 'this._err = 1',
			errors: createErrors(formatMessage('_err', ['_error'], 'property'))
		}),
		noFixingTestCase({
			code: 'this.__err__ = 1',
			errors: createErrors(formatMessage('__err__', ['__error__'], 'property'))
		}),
		noFixingTestCase({
			code: 'this.e_ = 1',
			errors: createErrors(formatMessage('e_', ['error_', 'event_'], 'property'))
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
			errors: createErrors(formatMessage('_e', ['_error', '_event'], 'variable'))
		}),

		{
			code: 'class Err {}',
			output: 'class Error_ {}',
			errors: createErrors(formatMessage('Err', ['Error'], 'variable'))
		},
		{
			code: 'class Cb {}',
			output: 'class Callback {}',
			errors: createErrors(formatMessage('Cb', ['Callback'], 'variable'))
		},
		noFixingTestCase({
			code: 'class Res {}',
			errors: createErrors(formatMessage('Res', ['Response', 'Result'], 'variable'))
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
			errors: createErrors(formatMessage('Err', ['Error'], 'property'))
		}),
		noFixingTestCase({
			code: '({Res: 1})',
			errors: createErrors(formatMessage('Res', ['Response', 'Result'], 'property'))
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
					const {docs = {}} = unicorn;
					return docs;
				}
			`,
			output: outdent`
				function unicorn(unicorn) {
					const {docs: documents = {}} = unicorn;
					return documents;
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
			filename: '_err.js',
			errors: createErrors(formatMessage('_err.js', ['_error.js'], 'filename'))
		},
		{
			code: 'foo();',
			filename: 'http.err.js',
			errors: createErrors(formatMessage('http.err.js', ['http.error.js'], 'filename'))
		},
		{
			code: 'foo();',
			filename: 'e.js',
			errors: createErrors(formatMessage('e.js', ['error.js', 'event.js'], 'filename'))
		},
		{
			code: 'foo();',
			filename: 'c.js',
			options: extendedOptions,
			errors: createErrors(formatMessage('c.js', ['custom.js'], 'filename'))
		},
		{
			code: 'foo();',
			filename: 'cb.js',
			options: extendedOptions,
			errors: createErrors(formatMessage('cb.js', ['circuitBreacker.js'], 'filename'))
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
		`
	],

	invalid: [
		{
			code: 'Foo.customProps = {}',
			errors: createErrors()
		},
		{
			code: outdent`
				class Foo {
					static propTypesAndStuff = {};
				}
			`,
			errors: createErrors()
		},
		{
			code: outdent`
				class Foo {
					static getDerivedContextFromProps() {}
				}
			`,
			errors: createErrors()
		},

		noFixingTestCase({
			code: '(class {e = 1})',
			errors: createErrors(formatMessage('e', ['error', 'event'], 'property'))
		}),
		noFixingTestCase({
			code: '(class {err = 1})',
			errors: createErrors(formatMessage('err', ['error'], 'property'))
		}),
		noFixingTestCase({
			code: outdent`
				class C {
					err = () => {}
				}
			`,
			errors: createErrors()
		})
	]
});
