import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prevent-abbreviations';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
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

		// `err` in not defined, should not be report (could be reported by `no-unused-vars`)
		'console.log(err)',

		'let c',
		{
			code: 'let c',
			options: customOptions
		},

		{
			code: 'let cb',
			options: customOptions
		},

		{
			code: 'let e',
			options: extendedOptions
		},

		// Renaming to `arguments` would result in a `SyntaxError`, so it should keep `args`
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
			code: 'let cb',
			output: 'let callback',
			errors: createErrors()
		},
		{
			code: 'let cb',
			output: 'let circuitBreacker',
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
					let error2;
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
					let error2;
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
					let error2;
					console.log(error, error2);
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
		}
	]
});
