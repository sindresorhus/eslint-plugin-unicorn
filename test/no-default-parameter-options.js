import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-default-parameter-options';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2018
	}
});

const error = {
	message: 'Use object spreading instead of passing default parameters with an object'
};

ruleTester.run('no-default-parameter-options', rule, {
	valid: [
		'let foo;',
		'const foo = options => {};',
		'const foo = (options = {}) => {};',
		'const foo = (options = null) => {};',
		'const foo = (options = undefined) => {};',
		'const foo = ({a = true, b = true}) => {};',
		'const foo = (bar = {a: false}) => {};',
		'const foo = (bar = {a: false, b: true}) => {};',
		'const foo = (bar = {}) => {};',
		'function foo(options = {}) {}',
		'function foo(options) {}',
		`const foo = options => {
			options = {
				a: false,
				b: true,
				...options
			};
		};`,
		`const fooDefaults = {};
		const foo = (options = fooDefaults) => {};`,
		`const fooDefaults = {
			a: false,
			b: true
		};`
	],
	invalid: [
		{
			code: 'const foo = (options = {a: false}) => {};',
			output: `const foo = (options) => {
			options = {
				a: false,
				...options
			};
		};`,
			errors: [error]
		},
		{
			code: `const foo = (options = {a: true, b: false}) => {
				bar();
				baz = foo;
			};`,
			output: `const foo = (options) => {
			options = {
				a: true,
b: false,
				...options
			};

bar();
baz = foo;
		};`,
			errors: [error]
		},
		{
			code: 'const foo = (options = {a: false, b: 1, c: "test", d: null}) => {};',
			output: `const foo = (options) => {
			options = {
				a: false,
b: 1,
c: "test",
d: null,
				...options
			};
		};`,
			errors: [error]
		},
		{
			code: 'const foo = (opts = {a: false}) => {};',
			output: `const foo = (opts) => {
			opts = {
				a: false,
				...opts
			};
		};`,
			errors: [error]
		},
		{
			code: 'function foo(options = {a: false}) {}',
			output: `function foo(options) {
			options = {
				a: false,
				...options
			};
		}`,
			errors: [error]
		},
		{
			code: `const fooDefaults = {
				a: false,
				b: true
			}

			const foo = (options = fooDefaults) => {};`,
			errors: [error]
		},
		{
			code: `const fooDefaults = {
				a: false,
				b: true
			}

			const foo = (options = fooDefaults) => {
				bar();
				baz = foo;
			};
			const bar = (options = fooDefaults) => {};`,
			errors: [error, error]
		},
		{
			code: `const fooDefaults = {
				a: false,
				b: true
			}

			const barDefaults = {
				a: false,
				b: 1,
				c: "test",
				d: null
			};

			const foo = (options = fooDefaults) => {};
			const bar = (options = barDefaults) => {};`,
			errors: [error, error]
		}
	]
});
