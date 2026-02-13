import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const error = {
	messageId: 'no-unused-properties',
};

test({
	valid: [
		outdent`
			const foo = {a: 1, b: 2};
			console.log(foo.a, foo.b);
		`,
		outdent`
			const foo = {'a': 1, "b": 2};
			function main() {
				console.log(foo.a, foo.b);
			}
		`,
		outdent`
			const foo = {a: 1, b: 2};
			console.log(foo['a'], foo["b"]);
		`,
		outdent`
			const foo = {["a"]: 1, ['b']: 2};
			console.log(foo['a'], foo["b"]);
		`,
		outdent`
			const foo = {['a']: 1, ["b"]: 2};
			console.log(foo['a'], foo["b"]);
		`,
		outdent`
			const a = Symbol('a');
			const b = 'b';
			const c = {};
			const foo = {
				[a]: 1,
				[b]: 2,
				[c]: 3
			};
			console.log(foo[a]);
		`,
		outdent`
			const a = 'a';
			const foo = {
				[a]: 1,
			};
			const a_ = a;
			console.log(foo[a_]);
		`,
		outdent`
			const a = 'a';
			const foo = {
				[a]: 1,
			};
			console.log(foo[x]);
		`,
		outdent`
			const a = Symbol('a');
			const foo = {[a]: 1};
			console.log(foo);
		`,
		outdent`
			const b = 'b';
			const foo = {[b]: 2};
			console.log(foo);
		`,
		outdent`
			const c = {};
			const foo = {[c]: 3};
			console.log(foo);
		`,
		outdent`
			const foo = {a: 1, b: 2};
			const {a, b} = foo;
		`,
		outdent`
			const foo = {a: 1, b: 2};
			({a, b} = foo);
		`,
		outdent`
			const foo = {a: 1, b: 2};
			console.log(foo[x]);
		`,
		outdent`
			const foo = {a: 1, b: 2};
			function main() {
				console.log(foo[x]);
			}
		`,
		outdent`
			const foo = {a: { b: 2 }};
			console.log(foo.a[x]);
		`,
		outdent`
			const foo = {a: { b: 2 }};
			console.log(foo.a);
		`,
		outdent`
			const foo = {a: 1, b: 2};
			console.log(foo);
		`,
		outdent`
			const foo = {a: 1, b: 2};
			function main() {
				console.log(foo);
			}
		`,
		outdent`
			const foo = {
				a: 1,
				f() {
					return this.a;
				}
			};
		`,
		outdent`
			const foo = {
				a: 1,
				f() {
					return this;
				}
			};
		`,
		outdent`
			const foo = {
				a: 1
			};
			foo.f = function () { return this.a };
		`,
		outdent`
			const foo = {
				a: 1
			};
			foo.f = function () { return this };
		`,
		outdent`
			const foo = {
				a: {
					b: 1
				}
			};
			foo.a.f = function () { return this };
		`,
		outdent`
			const foo = {
				a: {
					b: 1
				}
			};
			Object.assign(foo.a, {
				f() {
					return this;
				}
			});
		`,
		outdent`
			const foo = {
				a: 1,
				__proto__: {
					c: 3
				}
			};
			console.log(foo.a);
		`,
		outdent`
			const bar = {
				b: 2
			};
			const foo = {
				a: 1,
				['__proto__']: bar
			};
			console.log(foo.a);
		`,
		outdent`
			const foo = {
				a: 1
			};
			foo.hasOwnProperty(x);
		`,
		outdent`
			const foo = {
				a: {
					b: {
						c: 1
					}
				}
			};
			console.log(foo.a.b.c);
		`,
		outdent`
			const foo = {a: 1, b: 2};
		`,
		outdent`
			const foo = {};
			foo.a = 1;
			foo.b = 2;
			console.log(foo.a);
		`,
		outdent`
			var foo = {};
			foo.a = 1;
			foo.b = 2;
			console.log(foo.a);
		`,
		outdent`
			var foo = {a: 1, b: 2};
			foo = { a: 3, b: 4 };
			console.log(foo.a);
		`,
		outdent`
			const foo = function () {};
		`,
		outdent`
			const foo = [];
		`,
		outdent`
			let foo;
		`,
		outdent`
			var foo;
		`,
		outdent`
			function foo() {}
			foo();
		`,
		outdent`
			const foo = {};
			export default foo;
		`,
		outdent`
			var foo = {
				a: {
					b: {
						c: {
							d: 1
						}
					}
				}
			};
			export {foo};
		`,
		outdent`
			export const foo = {
				a: 1,
				b: 2
			};
			console.log(foo.a);
		`,
		outdent`
			var foo = {
				a: 1
			};
			module.exports = foo;
		`,
		outdent`
			var foo = {
				a: 1
			};
			exports.foo = foo;
		`,
		outdent`
			const foo = {a: 1, b: 2};
			const {a, ...rest} = foo;
		`,
	],

	invalid: [
		{
			code: outdent`
				const foo = {a: 1, u: 2};
				console.log(foo.a);
			`,
			errors: [error],
		},
		{
			code: outdent`
				const foo = {"a": 1, "u": 2};
				console.log(foo.a);
			`,
			errors: [error],
		},
		{
			code: outdent`
				const foo = {a: 1, u: 2};
				console.log(foo['a']);
			`,
			errors: [error],
		},
		{
			code: outdent`
				const foo = {a: 1, u: 2};
				function main() {
					console.log(foo.a);
				}
			`,
			errors: [error],
		},

		{
			code: outdent`
				const foo = {a: 1, u: 2};
				const {a} = foo;
			`,
			errors: [error],
		},

		{
			code: outdent`
				const foo = {a: 1, u: 2};
				({a} = foo);
			`,
			errors: [error],
		},

		{
			code: outdent`
				const foo = {
					a: 1,
					u: {
						b: 2,
						c: 3
					}
				};
				console.log(foo.a);
			`,
			errors: [error],
		},

		{
			code: outdent`
				const foo = {
					a: 1,
					b: {
						c: 2,
						u: 3
					}
				};
				console.log(foo.a, foo.b.c);
			`,
			errors: [error],
		},
		{
			code: outdent`
				const foo = {
					a: 1,
					b: {
						c: 2,
						u: 3
					}
				};
				function main() {
					console.log(foo.a, foo.b.c);
				}
			`,
			errors: [error],
		},
		{
			code: outdent`
				const foo = {
					a: {
						b: 1
					},
					u: 2
				};
				foo.a.f = function () { return this };
			`,
			errors: [error],
		},

		{
			code: outdent`
				const foo = {
					a: 1,
					[u]: 2
				};
				console.log(foo.a);
			`,
			errors: [error],
		},

		{
			code: outdent`
				const foo = {
					__proto__: {a: 1},
					b: 2,
					u: 3
				};
				console.log(foo.b);
			`,
			errors: [error],
		},

		{
			code: outdent`
				const foo = {
					[foo.bar]: 1
				};
			`,
			errors: [error],
		},
		{
			code: outdent`
				const styles = {
					wrapper: styled('div', {}),
					unused: styled('div', {}),
				};

				function Component() {
					return <styles.wrapper />;
				}
			`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
			errors: [error],
		},
	],
});

test.babel({
	valid: [
		outdent`
			const foo1 = {a: 1, b: 2};
			const {a, ...rest} = foo1;
		`,

		outdent`
			const foo = {
				...bar,
			};
			console.log(foo.a);
		`,
	],
	invalid: [],
});

test.typescript({
	valid: [
		outdent`
			type Configuration = {
				debounce: {
					wait: number;
				};
			};

			const configurationInput = {};

			const {
				debounce: userDebounce,
			}: Configuration = {
				debounce: {
					wait: 1000,
				},
				...configurationInput,
			};

			console.log(userDebounce);
		`,
	],
	invalid: [],
});

test.snapshot({
	valid: [],
	invalid: [
		outdent`
			function foo() {
				const bar = {
					b: 2,
					u: 3
				};
				console.log(bar.b);
			}
		`,
	],
});
