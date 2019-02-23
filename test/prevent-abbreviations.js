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
	extendDefaults: false,
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
		}
	}
}];

ruleTester.run('prevent-abbreviations', rule, {
	valid: [
		'let x',
		'let error',
		'error => {}',
		'(function (error) {})',
		'function f(x) {}',
		'(class {})',
		'(class C {})',
		'class C {}',

		// `err` in not defined, should not be report (could be reported by `no-unused-vars`)
		'console.log(err)',

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
		{
			code: 'let e',
			errors: createErrors('Please rename this variable. Suggested names are: `error`, `event`. A more descriptive name will do too.')
		},
		{
			code: 'let err',
			errors: createErrors('This variable should be named `error`. A more descriptive name will do too.')
		},
		{
			code: 'let evt',
			errors: createErrors('This variable should be named `event`. A more descriptive name will do too.')
		},

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
		}
	]
});

moduleRuleTester.run('prevent-abbreviations', rule, {
	valid: [],

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
		}
	]
});
