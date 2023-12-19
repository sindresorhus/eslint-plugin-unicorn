import outdent from 'outdent';
import {getTester, parsers} from './utils/test.mjs';

const {test} = getTester(import.meta);

const messageId = 'no-useless-undefined';

const errors = [{messageId}];
const optionsIgnoreArguments = [{checkArguments: false}];

test({
	valid: [
		'function foo() {return;}',
		'const foo = () => {};',
		'let foo;',
		'var foo;',
		'const foo = undefined;',
		'foo();',
		'foo(bar,);',
		'foo(undefined, bar);',
		'const {foo} = {};',
		'function foo({bar} = {}) {}',
		'function foo(bar) {}',
		// I guess nobody use this, but `yield* undefined;` is valid code, and `yield*;` is not
		'function* foo() {yield* undefined;}',

		// Ignored
		'if (Object.is(foo, undefined)){}',
		't.is(foo, undefined)',
		'assert.equal(foo, undefined, message)',
		'assert.notEqual(foo, undefined, message)',
		'assert.strictEqual(foo, undefined, message)',
		'assert.notStrictEqual(foo, undefined, message)',
		'assert.propertyVal(foo, "bar", undefined, message)',
		'assert.notPropertyVal(foo, "bar", undefined, message)',
		'expect(foo).not(undefined)',
		'expect(foo).to.have.property("bar", undefined)',
		'expect(foo).to.have.property("bar", undefined)',
		'expect(foo).toBe(undefined)',
		'expect(foo).toContain(undefined)',
		'expect(foo).toContainEqual(undefined)',
		'expect(foo).toEqual(undefined)',
		't.same(foo, undefined)',
		't.notSame(foo, undefined)',
		't.strictSame(foo, undefined)',
		't.strictNotSame(foo, undefined)',
		'expect(someFunction).toHaveBeenCalledWith(1, 2, undefined);',
		'set.add(undefined);',
		'map.set(foo, undefined);',
		'array.push(foo, undefined);',
		'array.push(undefined);',
		'array.unshift(foo, undefined);',
		'array.unshift(undefined);',
		'createContext(undefined);',
		'React.createContext(undefined);',
		'setState(undefined)',
		'setState?.(undefined)',
		'props.setState(undefined)',
		'props.setState?.(undefined)',
		'array.includes(undefined)',
		'set.has(undefined)',

		// `Function#bind()`
		'foo.bind(bar, undefined)',
		'foo.bind(...bar, undefined)',
		'foo.bind(...[], undefined)',
		'foo.bind(...[undefined], undefined)',
		'foo.bind(bar, baz, undefined)',
		'foo?.bind(bar, undefined)',

		// `checkArguments: false`
		{
			code: 'foo(undefined, undefined);',
			options: optionsIgnoreArguments,
		},
		{
			code: 'foo.bind(undefined);',
			options: optionsIgnoreArguments,
		},
	],
	invalid: [
		{
			code: 'function foo() {return undefined;}',
			output: 'function foo() {return;}',
			errors,
		},
		{
			code: 'const foo = () => undefined;',
			output: 'const foo = () => {};',
			errors,
		},
		{
			code: 'const foo = () => {return undefined;};',
			output: 'const foo = () => {return;};',
			errors,
		},
		{
			code: 'function foo() {return       undefined;}',
			output: 'function foo() {return;}',
			errors,
		},
		{
			code: 'function foo() {return /* comment */ undefined;}',
			output: 'function foo() {return /* comment */;}',
			errors,
		},
		{
			code: 'function* foo() {yield undefined;}',
			output: 'function* foo() {yield;}',
			errors,
		},
		{
			code: 'function* foo() {yield                 undefined;}',
			output: 'function* foo() {yield;}',
			errors,
		},
		{
			code: 'let a = undefined;',
			output: 'let a;',
			errors,
		},
		{
			code: 'let a = undefined, b = 2;',
			output: 'let a, b = 2;',
			errors,
		},
		{
			code: 'var a = undefined;',
			output: 'var a;',
			errors,
		},
		{
			code: 'var a = undefined, b = 2;',
			output: 'var a, b = 2;',
			errors,
		},
		{
			code: 'foo(undefined);',
			output: 'foo();',
			errors,
		},
		{
			code: 'foo(undefined, undefined);',
			output: 'foo();',
			errors,
		},
		{
			code: 'foo(undefined,);',
			output: 'foo();',
			errors,
		},
		{
			code: 'foo(undefined, undefined,);',
			output: 'foo();',
			errors,
		},
		{
			code: 'foo(bar, undefined);',
			output: 'foo(bar);',
			errors,
		},
		{
			code: 'foo(bar, undefined, undefined);',
			output: 'foo(bar);',
			errors,
		},
		{
			code: 'foo(undefined, bar, undefined);',
			output: 'foo(undefined, bar);',
			errors,
		},
		{
			code: 'foo(bar, undefined,);',
			output: 'foo(bar,);',
			errors,
		},
		{
			code: 'foo(undefined, bar, undefined,);',
			output: 'foo(undefined, bar,);',
			errors,
		},
		{
			code: 'foo(bar, undefined, undefined,);',
			output: 'foo(bar,);',
			errors,
		},
		{
			code: 'foo(undefined, bar, undefined, undefined,);',
			output: 'foo(undefined, bar,);',
			errors,
		},
		// Test report range
		{
			code: outdent`
				foo(
					undefined,
					bar,
					undefined,
					undefined,
					undefined,
					undefined,
				)
			`,
			output: outdent`
				foo(
					undefined,
					bar,
				)
			`,
			errors: [
				{
					messageId,
					// The second `undefined`
					line: 4, column: 2,
					// The last `undefined`
					endLine: 7, endColumn: 11,
				},
			],
		},
		{
			code: 'const {foo = undefined} = {};',
			output: 'const {foo} = {};',
			errors,
		},
		{
			code: 'const [foo = undefined] = [];',
			output: 'const [foo] = [];',
			errors,
		},
		{
			code: 'function foo(bar = undefined) {}',
			output: 'function foo(bar) {}',
			errors,
		},
		{
			code: 'function foo({bar = undefined}) {}',
			output: 'function foo({bar}) {}',
			errors,
		},
		{
			code: 'function foo({bar = undefined} = {}) {}',
			output: 'function foo({bar} = {}) {}',
			errors,
		},
		{
			code: 'function foo([bar = undefined]) {}',
			output: 'function foo([bar]) {}',
			errors,
		},
		{
			code: 'function foo([bar = undefined] = []) {}',
			output: 'function foo([bar] = []) {}',
			errors,
		},
		{
			code: 'return undefined;',
			output: 'return;',
			errors,
			parserOptions: {
				sourceType: 'script',
				ecmaFeatures: {
					globalReturn: true,
				},
			},
		},
	],
});

test.typescript({
	valid: [
		// https://github.com/zeit/next.js/blob/3af0fe5cf2542237f34d106872d104c3606b1858/packages/next/build/utils.ts#L620
		'prerenderPaths?.add(entry)',
		// #880
		outdent`
			function getThing(): string | undefined {
				if (someCondition) {
					return "hello world";
				}

				return undefined;
			}
		`,
		outdent`
			function getThing(): string | undefined {
				if (someCondition) {
					return "hello world";
				} else if (anotherCondition) {
					return undefined;
				}

				return undefined;
			}
		`,
		'const foo = (): undefined => {return undefined;}',
		'const foo = (): undefined => undefined;',
		'const foo = (): string => undefined;',
		'const foo = function (): undefined {return undefined}',
		'export function foo(): undefined {return undefined}',
		'createContext<T>(undefined);',
		'React.createContext<T>(undefined);',
		outdent`
			const object = {
				method(): undefined {
					return undefined;
				}
			}
		`,
		outdent`
			class A {
				method(): undefined {
					return undefined;
				}
			}
		`,
		outdent`
			const A = class A {
				method(): undefined {
					return undefined
				}
			};
		`,
		outdent`
			class A {
				static method(): undefined {
					return undefined
				}
			}
		`,
		outdent`
			class A {
				get method(): undefined {
					return undefined;
				}
			}
		`,
		outdent`
			class A {
				static get method(): undefined {
					return undefined;
				}
			}
		`,
		outdent`
			class A {
				#method(): undefined {
					return undefined;
				}
			}
		`,
		outdent`
			class A {
				private method(): undefined {
					return undefined;
				}
			}
		`,
		'createContext<T>(undefined);',
		'React.createContext<T>(undefined);',
	],
	invalid: [
		{
			code: outdent`
				function foo():undefined {
					function nested() {
						return undefined;
					}

					return nested();
				}
			`,
			output: outdent`
				function foo():undefined {
					function nested() {
						return;
					}

					return nested();
				}
			`,
			errors: 1,
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		outdent`
			foo(
				undefined,
				bar,
				undefined,
				undefined,
				undefined,
				undefined,
			)
		`,
		'function foo([bar = undefined] = []) {}',
		'foo(bar, undefined, undefined);',
		'let a = undefined, b = 2;',
		outdent`
			function foo() {
				return /* */ (
					/* */
					(
						/* */
						undefined
						/* */
					)
					/* */
				) /* */ ;
			}
		`,
		outdent`
			function * foo() {
				yield /* */ (
					/* */
					(
						/* */
						undefined
						/* */
					)
					/* */
				) /* */ ;
			}
		`,
		outdent`
			const foo = () => /* */ (
				/* */
				(
					/* */
					undefined
					/* */
				)
				/* */
			);
		`,
		'foo.bind(undefined)',
		'bind(foo, undefined)',
		'foo.bind?.(bar, undefined)',
		'foo[bind](bar, undefined)',
		'foo.notBind(bar, undefined)',
	],
});

test.snapshot({
	testerOptions: {
		parser: parsers.vue,
	},
	valid: [
		outdent`
			<script>
			import {ref} from 'vue';

			export default {
				setup() {
					return {foo: ref(undefined)};
				}
			};
			</script>
		`,
		outdent`
			<script setup>
			import * as vue from 'vue';
			const foo = vue.ref(undefined);
			</script>
		`,
	],
	invalid: [
		outdent`
			<script>
			import {nextTick} from 'vue';
			const foo = nextTick(undefined);
			</script>
		`,
	],
});

test.snapshot({
	testerOptions: {
		parser: parsers.typescript,
	},
	valid: [],
	invalid: [
		'function f(foo: Type = undefined) {}',
		'function f(foo?: Type = undefined) {}',
		'const f = function(foo: Type = undefined) {}',
		'const f = (foo: Type = undefined) => {}',
		'const f = {method(foo: Type = undefined){}}',
		'const f = class {method(foo: Type = undefined){}}',
		'function f(foo = undefined) {}',
		...[
			undefined,
			'foo.js',
			'foo.ts',
			'foo.MTs',
			'foo.cts',
			'foo.tsx',
		].map(filename => ({
			code: 'function f(foo = undefined) {}',
			filename,
		})),
		{
			code: 'function a({foo} = undefined) {}',
			filename: 'foo.ts',
		},
	],
});
