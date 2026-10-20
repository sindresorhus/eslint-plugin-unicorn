import path from 'node:path';
import {Linter} from 'eslint';
import typescript from 'typescript';
import outdent from 'outdent';
import {typescriptEslintParser} from '../../scripts/parsers.js';
import {parsers} from '../utils/test.js';

function snapshotTests({method, replacement}) {
	return {
		valid: [
			`const ${method} = foo.${method}`,

			// Test `foo.findIndex`
			// More/less argument(s)
			`foo.${method}()`,
			`foo.${method}(function (x) {return x === 1;}, bar)`,
			`foo.${method}(...[function (x) {return x === 1;}])`,
			// Not `CallExpression`
			`new foo.${method}(x => x === 1)`,
			// Not `MemberExpression`
			`${method}(x => x === 1)`,
			// `callee.property` is not a `Identifier`
			`foo["${method}"](x => x === 1)`,
			// Computed
			`foo[${method}](x => x === 1)`,
			// Not `findIndex`
			`foo.not_${method}(x => x === 1)`,

			// Test `callback` part
			// Not function
			`foo.${method}(myFunction)`,
			// Not one parameter
			`foo.${method}((x, i) => x === i)`,
			`foo.${method}((x, i) => {return x === i})`,
			`foo.${method}(function(x, i) {return x === i})`,
			// Parameter is not `Identifier`
			`foo.${method}(({x}) => x === 1)`,
			`foo.${method}(({x}) => {return x === 1})`,
			`foo.${method}(function({x}) {return x === 1})`,
			// `generator`
			`foo.${method}(function * (x) {return x === 1})`,
			// `async`
			`foo.${method}(async (x) => x === 1)`,
			`foo.${method}(async (x) => {return x === 1})`,
			`foo.${method}(async function(x) {return x === 1})`,

			// Test `callback` body
			// Bare `return`, the `ReturnStatement#argument` is `null`
			`foo.${method}(x => {return;})`,
			`foo.${method}(function (x) {return;})`,
			`foo.${method}((x = 1) => {return;})`,
			`foo.${method}(() => {return;})`,
			// Not only `return`
			`foo.${method}(({x}) => {noop();return x === 1})`,
			// Not `return`
			`foo.${method}(({x}) => {bar(x === 1)})`,

			// Test `BinaryExpression`
			// Not `BinaryExpression`
			`foo.${method}(x => x - 1)`,
			`foo.${method}(x => {return x - 1})`,
			`foo.${method}(function (x){return x - 1})`,
			// Not `===`
			`foo.${method}(x => x !== 1)`,
			`foo.${method}(x => {return x !== 1})`,
			`foo.${method}(function (x){return x !== 1})`,
			// Neither `left` nor `right` is Identifier
			`foo.${method}(x => 1 === 1.0)`,
			`foo.${method}(x => {return 1 === 1.0})`,
			`foo.${method}(function (x){return 1 === 1.0})`,
			// Both `left` and `right` are same as `parameter`
			`foo.${method}(x => x === x)`,

			// Not the same identifier
			`foo.${method}(x => y === 1)`,

			// Dynamical value
			`foo.${method}(x => x + "foo" === "foo" + x)`,

			// Parameter is used
			`foo.${method}(x => x === "foo" + x)`,
			// Parameter is used in a deeper scope
			`foo.${method}(x => x === (function (){return x === "1"})())`,
			// FunctionName is used
			`foo.${method}(function fn(x) {return x === fn(y)})`,
			// `arguments` is used
			`foo.${method}(function(x) {return x === arguments.length})`,
			// `this` is used
			`foo.${method}(function(x) {return x === this.length})`,

			// Already valid case
			`foo.${replacement}(0)`,

			// Can't use scopeManager in Vue.js template
			// https://github.com/vuejs/vue-eslint-parser/issues/263
			{
				code: `<template><div v-if="values.${method}(x => x === 'foo')"></div></template>`,
				languageOptions: {parser: parsers.vue},
			},

			// Known non-array receiver (type information)
			{
				code: `function f(foo: Set<number>) { return foo.${method}(x => x === 1); }`,
				languageOptions: {parser: parsers.typescript},
			},
		],

		invalid: [
			`values.${method}(x => x === "foo")`,
			`values?.${method}(x => x === "foo")`,
			`values.${method}(x => "foo" === x)`,
			`values.${method}(x => {return x === "foo";})`,
			`values.${method}(function (x) {return x === "foo";})`,
			outdent`
				// 1
				(0, values)
					// 2
					./* 3 */${method} /* 3 */ (
						/* 4 */
						x /* 5 */ => /* 6 */ x /* 7 */ === /* 8 */ "foo" /* 9 */
					) /* 10 */
			`,
			outdent`
				foo.${method}(function (element) {
					return element === bar.${method}(x => x === 1);
				});
			`,
			`values.${method}(x => x === (0, "foo"))`,
			`values.${method}((x => x === (0, "foo")))`,
			// `this`/`arguments` in arrow functions
			outdent`
				function fn() {
					foo.${method}(x => x === arguments.length)
				}
			`,
			outdent`
				function fn() {
					foo.${method}(x => x === this[1])
				}
			`,
			`values.${method}(x => x === foo())`,
			outdent`
				foo.${method}(function a(x) {
					return x === (function (a) {
						return a(this) === arguments[1]
					}).call(thisObject, anotherFunctionNamedA, secondArgument)
				})
			`,
			...['target', 'target.id', 'target?.id', '1 + 2', '-2n', '+1n', 'undefined', '/item/u', '`item`'].map(expression => `values.${method}(item => item === ${expression});`),
			`const target = 2; values.${method}(item => item === target);`,
			`values.${method}(item => item === /* keep */ target.id);`,
		],
	};
}

function typescriptTests({method, replacement}) {
	return {
		valid: [],
		invalid: [
			{
				code: `const values = ["small", "medium", "large"] as const; declare const input: string; values.${method}(value => value === input);`,
				output: `const values = ["small", "medium", "large"] as const; declare const input: string; values.${replacement}(input);`,
				errors: 1,
			},
			...['(target as number)', '(target satisfies number)', 'target!', '<number>target', '(-2 as number)', '(2 satisfies number)', '2!', '<number>2'].map(expression => ({
				code: `values.${method}(item => item === ${expression});`,
				output: `values.${replacement}(${expression});`,
				errors: 1,
			})),
			{
				code: `values.${method}(item => item === (getTarget() as number));`,
				errors: [{
					messageId: `prefer-${replacement}-over-${method}/error`,
					suggestions: [{messageId: `prefer-${replacement}-over-${method}/suggestion`, output: `values.${replacement}((getTarget() as number));`}],
				}],
			},
			{
				code: outdent`
					function foo() {
						return (bar as string[]).${method}(x => x === "foo");
					}
				`,
				output: outdent`
					function foo() {
						return (bar as string[]).${replacement}("foo");
					}
				`,
				errors: 1,
			},
		],
	};
}

export default function tests(options) {
	return {
		snapshot: snapshotTests(options),
		typescript: typescriptTests(options),
	};
}

function createTypeScriptProgram(code, filename) {
	const options = {
		strict: true, noEmit: true, types: [], target: typescript.ScriptTarget.ESNext,
	};
	const host = typescript.createCompilerHost(options);
	const {getSourceFile} = host;
	host.getSourceFile = (name, ...arguments_) => name === filename
		? typescript.createSourceFile(name, code, options.target, true)
		: getSourceFile(name, ...arguments_);
	return typescript.createProgram([filename], options, host);
}

export function testTypeAwareSearches({method, replacement, rule, test}) {
	const returnType = method === 'some' ? 'value is Type' : 'number';
	for (const [name, setup, callback, searchValue, hasSideEffect = false] of [
		['wider string', 'const values = ["small", "medium", "large"] as const; declare const input: string;', 'value => value === input'],
		['reversed comparison', 'const values = ["small", "medium", "large"] as const; declare const input: string;', 'value => input === value'],
		['generic unknown', `function check<Type>(value: unknown, values: readonly Type[]): ${returnType} { return`, 'option => option === value'],
		['optional value with block body', 'declare const values: string[]; declare const input: string | undefined;', 'value => {return value === input;}'],
		['incompatible side effect', 'const values = ["small", "medium", "large"] as const; declare function getInput(): string;', 'value => value === getInput()'],
		['compatible string', 'declare const values: string[]; declare const input: string;', 'value => value === input', 'input'],
		['compatible side effect', 'declare const values: string[]; declare function getInput(): string;', 'value => value === getInput()', 'getInput()', true],
		['compatible literal', 'const values = ["small", "medium", "large"] as const;', 'value => value === "small"', '"small"'],
		['compatible generic', 'function check<Type>(input: Type, values: readonly Type[]) { return', 'value => value === input', 'input'],
		['compatible optional value', 'declare const values: (string | undefined)[]; declare const input: string | undefined;', 'value => value === input', 'input'],
		['narrowed value', 'function check(values: string[], input: string | undefined) { if (typeof input !== "string") { return; } return', 'value => value === input', 'input'],
	]) {
		test(`${method}: ${name} with type information`, t => {
			const suffix = setup.startsWith('function') ? ' }' : '';
			const code = `${setup} values.${method}(${callback});${suffix}`;
			const filename = path.resolve(`simple-array-search-${method}.ts`);
			const program = createTypeScriptProgram(code, filename);
			t.assert.deepStrictEqual(typescript.getPreEmitDiagnostics(program), []);
			const config = {
				files: ['**/*.ts'],
				languageOptions: {parser: typescriptEslintParser, parserOptions: {programs: [program]}},
				plugins: {unicorn: {rules: {search: rule}}},
				rules: {'unicorn/search': 'error'},
			};
			const linter = new Linter();
			const messages = linter.verify(code, config, {filename});
			if (searchValue === undefined) {
				t.assert.deepStrictEqual(messages, []);
				return;
			}

			t.assert.strictEqual(messages.length, 1);
			t.assert.strictEqual(messages[0].messageId, `prefer-${replacement}-over-${method}/error`);
			if (hasSideEffect) {
				t.assert.strictEqual(messages[0].fix, undefined);
				t.assert.strictEqual(messages[0].suggestions.length, 1);
				t.assert.strictEqual(messages[0].suggestions[0].messageId, `prefer-${replacement}-over-${method}/suggestion`);
			}

			const {range, text} = hasSideEffect ? messages[0].suggestions[0].fix : messages[0].fix;
			const output = code.slice(0, range[0]) + text + code.slice(range[1]);
			t.assert.strictEqual(output, `${setup} values.${replacement}(${searchValue});${suffix}`);
			t.assert.deepStrictEqual(typescript.getPreEmitDiagnostics(createTypeScriptProgram(output, filename)), []);
		});
	}
}
