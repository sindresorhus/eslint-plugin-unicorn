import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const messageId = 'no-useless-undefined';
const suggestionMessageId = 'no-useless-undefined/suggestion';

const errors = [{messageId}];
const errorsWithSuggestion = output => [{
	messageId,
	suggestions: [{messageId: suggestionMessageId, output}],
}];
const errorsWithoutSuggestion = [{
	messageId,
	suggestions: [],
}];
const optionsIgnoreArguments = [{checkArguments: false}];
const optionsIgnoreArrowFunctionBody = [{checkArrowFunctionBody: false}];

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
		'const foo = index >= 0 ? array[index] : bar;',
		'const foo = index >= 0 ? object.property : undefined;',
		'const foo = index >= 0 ? array?.[index] : undefined;',
		'const foo = index >= 0 ? object?.items[index] : undefined;',
		'const foo = index >= 0 ? getArray()[index] : undefined;',
		'const foo = index >= 0 ? object.items[index] : undefined;',
		'const foo = index >= 0 ? array[index++] : undefined;',
		'const foo = index >= 0 ? array[getIndex()] : undefined;',
		'const foo = index < otherArray.length ? array[index] : undefined;',
		'const foo = index >= 0 ? array[index + 1] : undefined;',
		'const foo = index >= 0 ? array[otherIndex] : undefined;',
		'const foo = index >= 5 ? array[index] : undefined;',
		'const foo = index < array.length ? array[index - 1] : undefined;',
		'const foo = foo?.bar >= 0 ? array[foo.bar] : undefined;',

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
		'useRef(undefined);',
		'React.useRef(undefined);',
		'setState(undefined)',
		'setState?.(undefined)',
		'props.setState(undefined)',
		'props.setState?.(undefined)',
		'array.includes(undefined)',
		'set.has(undefined)',
		'set.delete(undefined)',

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

		// `checkArrowFunctionBody: false`
		{
			code: 'const foo = () => undefined',
			options: optionsIgnoreArrowFunctionBody,
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
			output: 'foo(undefined);',
			errors,
		},
		{
			code: 'foo(undefined,);',
			output: 'foo();',
			errors,
		},
		{
			code: 'foo(undefined, undefined,);',
			output: 'foo(undefined,);',
			errors,
		},
		{
			code: 'foo(bar, undefined);',
			output: 'foo(bar);',
			errors,
		},
		{
			code: 'foo(bar, undefined, undefined);',
			output: 'foo(bar, undefined);',
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
			output: 'foo(bar, undefined,);',
			errors,
		},
		{
			code: 'foo(undefined, bar, undefined, undefined,);',
			output: 'foo(undefined, bar, undefined,);',
			errors,
		},
		{
			code: 'Promise.resolve(undefined);',
			output: 'Promise.resolve();',
			filename: 'file.js',
			errors,
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
			languageOptions: {
				parserOptions: {
					sourceType: 'script',
					ecmaFeatures: {
						globalReturn: true,
					},
				},
			},
		},
		{
			code: 'const foo = index >= 0 ? array[index] : undefined;',
			errors: errorsWithSuggestion('const foo = array[index];'),
		},
		{
			code: 'const foo = index > -1 ? array[index] : undefined;',
			errors: errorsWithSuggestion('const foo = array[index];'),
		},
		{
			code: 'const foo = index < 0 ? undefined : array[index];',
			errors: errorsWithSuggestion('const foo = array[index];'),
		},
		{
			code: 'const foo = -1 < index ? array[index] : undefined;',
			errors: errorsWithSuggestion('const foo = array[index];'),
		},
		{
			code: 'const foo = 0 > index ? undefined : array[index];',
			errors: errorsWithSuggestion('const foo = array[index];'),
		},
		{
			code: 'const foo = index <= array.length - 1 ? array[index] : undefined;',
			errors: errorsWithSuggestion('const foo = array[index];'),
		},
		{
			code: 'const foo = index > array.length - 1 ? undefined : array[index];',
			errors: errorsWithSuggestion('const foo = array[index];'),
		},
		{
			code: 'const foo = index >= 5 ? array[index - 5] : undefined;',
			errors: errorsWithSuggestion('const foo = array[index - 5];'),
		},
		{
			code: 'const foo = 0 <= index ? array[index] : undefined;',
			errors: errorsWithSuggestion('const foo = array[index];'),
		},
		{
			code: 'const foo = index >= array.length ? undefined : array[index];',
			errors: errorsWithSuggestion('const foo = array[index];'),
		},
		{
			code: 'const foo = array.length <= index ? undefined : array[index];',
			errors: errorsWithSuggestion('const foo = array[index];'),
		},
		{
			code: 'const foo = array.length > index ? array[index] : undefined;',
			errors: errorsWithSuggestion('const foo = array[index];'),
		},
		{
			code: 'const foo = 5 <= index ? array[index - 5] : undefined;',
			errors: errorsWithSuggestion('const foo = array[index - 5];'),
		},
		{
			code: 'const foo = index < 5 ? undefined : array[index - 5];',
			errors: errorsWithSuggestion('const foo = array[index - 5];'),
		},
		{
			code: 'const foo = index >= 0 ? array[index] /* comment */ : undefined;',
			errors: errorsWithoutSuggestion,
		},
		{
			code: 'const foo = index /* comment */ >= 0 ? array[index] : undefined;',
			errors: errorsWithoutSuggestion,
		},
		{
			code: 'const foo = index >= 0 ? array[index] : /* comment */ undefined;',
			errors: errorsWithoutSuggestion,
		},
		{
			code: 'a()\nindex >= 0 ? [array][index] : undefined;',
			errors: errorsWithSuggestion('a()\n;[array][index];'),
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
		'const foo = (): undefined => undefined;',
		'const foo = (): string => undefined;',
		'createContext<T>(undefined);',
		'React.createContext<T>(undefined);',
		{
			code: outdent`
				function test<T extends object | undefined>(argument: T): void {}
				test(undefined);
			`,
			filename: 'file.ts',
		},
		...['file.ts', 'file.tsx', 'file.mts', 'file.cts'].map(filename => ({
			code: 'foo(undefined);',
			filename,
		})),
		{
			code: 'foo(value, undefined);',
			filename: 'file.ts',
		},
		{
			code: 'foo(undefined, value, undefined);',
			filename: 'file.ts',
		},
		{
			code: 'Promise.resolve(undefined);',
			filename: 'file.ts',
		},
		{
			code: 'Promise.resolve<undefined>(undefined);',
			filename: 'file.ts',
		},
		{
			code: 'Promise.resolve(foo, undefined);',
			filename: 'file.ts',
		},
		{
			code: 'Promise.resolve?.(undefined);',
			filename: 'file.ts',
		},
		{
			code: 'Promise?.resolve(undefined);',
			filename: 'file.ts',
		},
		{
			code: 'Promise["resolve"](undefined);',
			filename: 'file.ts',
		},
		{
			code: 'globalThis.Promise.resolve(undefined);',
			filename: 'file.ts',
		},
		{
			code: 'const resolve = Promise.resolve; resolve(undefined);',
			filename: 'file.ts',
		},
		{
			code: 'NotPromise.resolve(undefined);',
			filename: 'file.ts',
		},
	],
	invalid: [
		{
			code: 'function shouldBeFlagged(): undefined {return undefined;}',
			output: 'function shouldBeFlagged(): undefined {return;}',
			errors,
		},
		{
			code: 'const foo = function (): undefined {return undefined};',
			output: 'const foo = function (): undefined {return};',
			errors,
		},
		{
			code: outdent`
				class A {
					method(): undefined {
						return undefined;
					}
				}
			`,
			output: outdent`
				class A {
					method(): undefined {
						return;
					}
				}
			`,
			errors,
		},
		{
			code: 'export function foo(): undefined {return undefined}',
			output: 'export function foo(): undefined {return}',
			errors,
		},
		{
			code: outdent`
				const object = {
					method(): undefined {
						return undefined;
					}
				}
			`,
			output: outdent`
				const object = {
					method(): undefined {
						return;
					}
				}
			`,
			errors,
		},
		{
			code: outdent`
				const A = class A {
					method(): undefined {
						return undefined
					}
				};
			`,
			output: outdent`
				const A = class A {
					method(): undefined {
						return
					}
				};
			`,
			errors,
		},
		{
			code: outdent`
				class A {
					static method(): undefined {
						return undefined
					}
				}
			`,
			output: outdent`
				class A {
					static method(): undefined {
						return
					}
				}
			`,
			errors,
		},
		{
			code: outdent`
				class A {
					get method(): undefined {
						return undefined;
					}
				}
			`,
			output: outdent`
				class A {
					get method(): undefined {
						return;
					}
				}
			`,
			errors,
		},
		{
			code: outdent`
				class A {
					static get method(): undefined {
						return undefined;
					}
				}
			`,
			output: outdent`
				class A {
					static get method(): undefined {
						return;
					}
				}
			`,
			errors,
		},
		{
			code: outdent`
				class A {
					#method(): undefined {
						return undefined;
					}
				}
			`,
			output: outdent`
				class A {
					#method(): undefined {
						return;
					}
				}
			`,
			errors,
		},
		{
			code: outdent`
				class A {
					private method(): undefined {
						return undefined;
					}
				}
			`,
			output: outdent`
				class A {
					private method(): undefined {
						return;
					}
				}
			`,
			errors,
		},
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
		{
			code: 'const foo = (index as number) >= 0 ? array[index as number] : undefined;',
			errors: errorsWithSuggestion('const foo = array[index as number];'),
		},
		{
			code: 'const foo = index! >= 0 ? array[index!] : undefined;',
			errors: errorsWithSuggestion('const foo = array[index!];'),
		},
		{
			code: 'const foo = (index satisfies number) >= 0 ? array[index satisfies number] : undefined;',
			errors: errorsWithSuggestion('const foo = array[index satisfies number];'),
		},
		{
			code: 'const foo = <number>index >= 0 ? array[<number>index] : undefined;',
			errors: errorsWithSuggestion('const foo = array[<number>index];'),
		},
		// The numeric boundary and offset are unwrapped through TypeScript wrappers.
		{
			code: 'const foo = index >= (0 as number) ? array[index] : undefined;',
			errors: errorsWithSuggestion('const foo = array[index];'),
		},
		{
			code: 'const foo = index >= 5 ? array[index - (5 as number)] : undefined;',
			errors: errorsWithSuggestion('const foo = array[index - (5 as number)];'),
		},
		{
			code: 'const foo = index <= array.length - (1 as number) ? array[index] : undefined;',
			errors: errorsWithSuggestion('const foo = array[index];'),
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
		// https://github.com/webpack/webpack/blob/0f84d1e3bf69915dc060f23ced9dfa468a884a42/lib/wasm-sync/WasmFinalizeExportsPlugin.js#L49
		outdent`
			const referencedExports =
				compilation.getDependencyReferencedExports(
					/** @type {Dependency} */ (connection.dependency),
					undefined
				);
		`,
		'foo( ((a)), ((undefined)), ((undefined)), )',
		'foo( ((undefined)), ((undefined)), )',
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {parser: parsers.vue},
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
		languageOptions: {parser: parsers.typescript},
	},
	valid: [],
	invalid: [
		'function f(foo: Type = undefined) {}',
		'function f(foo?: Type = undefined) {}',
		// The enclosing function's return type is irrelevant to a redundant default or local initializer
		'function f(foo = undefined): string {}',
		'function f(): string { let bar = undefined; }',
		'const f = (): string => { let bar = undefined; };',
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
