import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/consistent-function-scoping';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020,
		ecmaFeatures: {
			jsx: true
		}
	}
});

const typescriptRuleTester = avaRuleTester(test, {
	parser: require.resolve('@typescript-eslint/parser')
});

const arrowError = {
	ruleId: 'consistent-function-scoping',
	messageId: 'ArrowFunctionExpression'
};

const functionError = {
	ruleId: 'consistent-function-scoping',
	messageId: 'FunctionDeclaration'
};

ruleTester.run('consistent-function-scoping', rule, {
	valid: [
		outdent`
			function doFoo(foo) {
				return foo;
			}
		`,
		outdent`
			function doFoo(foo) {
				return bar;
			}
		`,
		outdent`
			const doFoo = foo => foo;
		`,
		outdent`
			foo => foo;
		`,
		outdent`
			function doFoo(foo) {
				function doBar(bar) {
					return foo + bar;
				}
				return foo;
			}
		`,
		outdent`
			function doFoo(foo) {
				function doBar(bar) {
					return foo + bar;
				}
			}
		`,
		outdent`
			function doFoo(foo = 'foo') {
				function doBar(bar) {
					return foo + bar;
				}
			}
		`,
		outdent`
			function doFoo() {
				const foo = 'foo';
				function doBar(bar) {
					return foo + bar;
				}
				return foo;
			}
		`,
		outdent`
			function doFoo(foo) {
				function doBar(bar) {
					function doZaz(zaz) {
						return foo + bar + zaz;
					}
					return bar;
				}
				return foo;
			}
		`,
		outdent`
			for (let foo = 0; foo < 1; foo++) {
				function doBar(bar) {
					return bar + foo;
				}
			}
		`,
		outdent`
			let foo = 0;
			function doFoo() {
				foo = 1;
				function doBar(bar) {
					return foo + bar;
				}
				return foo;
			}
		`,
		outdent`
			const doFoo = foo => {
				return foo;
			}
		`,
		outdent`
			const doFoo =
				foo =>
				bar =>
				foo + bar;
		`,
		outdent`
			const doFoo = () => {
				return bar => bar;
			}
		`,
		outdent`
			function doFoo() {
				return bar => bar;
			}
		`,
		outdent`
			const doFoo = foo => {
				const doBar = bar => {
					return foo + bar;
				}
				return foo;
			}
		`,
		outdent`
			function doFoo() {
				{
					const foo = 'foo';
					function doBar(bar) {
						return bar + foo;
					}
				}
			}
		`,
		outdent`
			function doFoo(foo) {
				{
					function doBar(bar) {
						return bar;
					}
				}
				return foo;
			}
		`,
		outdent`
			function doFoo(foo) {
				function doBar(bar) {
					foo.bar = bar;
				}
				function doZaz(zaz) {
					doBar(zaz);
				}

				doZaz('zaz');
			};
		`,
		outdent`
			function doFoo() {
				return function doBar() {};
			}
		`,
		outdent`
			function doFoo(Foo) {
				function doBar() {
					return new Foo();
				}
				return doBar;
			};
		`,
		outdent`
			function doFoo(FooComponent) {
				return <FooComponent />;
			}
		`,
		outdent`
			function doFoo(FooComponent) {
				function Bar() {
					return <FooComponent />;
				}
				return Bar;
			};
		`,
		// #391
		outdent`
			const enrichErrors = (packageName, cliArgs, f) => async (...args) => {
				try {
					return await f(...args);
				} catch (error) {
					error.packageName = packageName;
					error.cliArgs = cliArgs;
					throw error;
				}
			};
		`,
		// #391 comment https://github.com/sindresorhus/eslint-plugin-unicorn/issues/391#issuecomment-536916771
		outdent`
			export const canStepForward = ([X, Y]) => ([x, y]) => direction => {
				switch (direction) {
					case 0:
						return y !== 0
					case 1:
						return x !== X - 1
					case 2:
						return y !== Y - 1
					case 3:
						return x !== 0
					default:
						throw new Error('unknown direction')
				}
			}
		`,
		// #374
		outdent`
			'use strict';

			module.exports = function recordErrors(eventEmitter, stateArgument) {
				const stateVariable = stateArgument;
				function onError(error) {
					stateVariable.inputError = error;
				}
				eventEmitter.once('error', onError);
			};
		`,
		// #375
		outdent`
			module.exports = function recordErrors(eventEmitter, stateArgument) {
				function onError(error) {
					stateArgument.inputError = error;
				}
				function onError2(error) {
					onError(error);
				}

				eventEmitter.once('error', onError2);
			};
		`,
		// #586
		outdent`
			function outer(stream) {
				let content;

				function inner() {
					process.stdout.write(content);
				}

				inner();
			}
		`
	],
	invalid: [
		{
			code: outdent`
				function doFoo(foo) {
					function doBar(bar) {
						return bar;
					}
					return foo;
				}
			`,
			errors: [functionError]
		},
		{
			code: outdent`
				function doFoo() {
					const foo = 'foo';
					function doBar(bar) {
						return bar;
					}
					return foo;
				}
			`,
			errors: [functionError]
		},
		{
			code: outdent`
				function doFoo() {
					function doBar(bar) {
						return bar;
					}
				}
			`,
			errors: [functionError]
		},
		{
			code: outdent`
				const doFoo = () => {
					const doBar = bar => {
						return bar;
					}
				}
			`,
			errors: [arrowError]
		},
		{
			code: outdent`
				const doFoo = () => bar => bar;
			`,
			errors: [arrowError]
		},
		{
			code: outdent`
				function doFoo(foo) {
					function doBar(bar) {
						return doBar(bar);
					}
					return foo;
				}
			`,
			errors: [functionError]
		},
		{
			code: outdent`
				function doFoo(foo) {
					function doBar(bar) {
						return bar;
					}
					return doBar;
				}
			`,
			errors: [functionError]
		},
		{
			code: outdent`
				function doFoo() {
					function doBar() {}
				}
			`,
			errors: [functionError]
		},
		{
			code: outdent`
				function doFoo(foo) {
					{
						{
							function doBar(bar) {
								return bar;
							}
						}
					}
					return foo;
				}
			`,
			errors: [functionError]
		},
		{
			code: outdent`
				{
					{
						function doBar(bar) {
							return bar;
						}
					}
				}
			`,
			errors: [functionError]
		},
		{
			code: outdent`
				for (let foo = 0; foo < 1; foo++) {
					function doBar(bar) {
						return bar;
					}
				}
			`,
			errors: [functionError]
		}
	]
});

typescriptRuleTester.run('consistent-function-scoping', rule, {
	valid: [
		// #372
		outdent`
			type Data<T> = T extends 'error' ? Error : Record<string, unknown> | unknown[]

			type Method = 'info' | 'error'

			export function createLogger(name: string) {
					// Two lint errors are on the next line.
					const log = <T extends Method>(method: T) => (data: Data<T>) => {
							try {
									// eslint-disable-next-line no-console
									console[method](JSON.stringify({ name, data }))
							} catch (error) {
									console.error(error)
							}
					}

					return {
							info: log('info'),
							error: log('error'),
					}
			}
		`,
		// #372 comment https://github.com/sindresorhus/eslint-plugin-unicorn/issues/372#issuecomment-546915612
		outdent`
			test('it works', async function(assert) {
				function assertHeader(assertions) {
					for (const [key, value] of Object.entries(assertions)) {
						assert.strictEqual(
							native[key],
							value
						);
					}
				}

				// ...
			});
		`,
		// #372 comment https://github.com/sindresorhus/eslint-plugin-unicorn/issues/372#issuecomment-546915612
		outdent`
			export function a(x: number) {
				const b = (y: number) => (z: number): number => x + y + z;
				return b(1)(2);
			}
		`
	],
	invalid: []
});
