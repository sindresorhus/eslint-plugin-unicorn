import vm from 'node:vm';
import path from 'node:path';
import {stripTypeScriptTypes} from 'node:module';
import test from 'node:test';
import {Linter} from 'eslint';
import outdent from 'outdent';
import ts from 'typescript';
import plugin from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: testRule} = getTester(import.meta);

testRule.snapshot({
	valid: [
		'function format(value) { return value; } format(1); format(2);',
		'function format(value) { return value; } format(1);',
		'function format(value) { return value; }',
		'function format(value) { return value; } for (const item of items) { format(1); }',
		'export function format(value) { return value; } format(1); format(1);',
		'function format(value) { return value; } export {format}; format(1); format(1);',
		'function format(value) { return value; } export default format; format(1); format(1);',
		'const format = value => value; consume(format); format(1); format(1);',
		'const format = value => value; const alias = format; format(1); format(1);',
		'function format(value) { return value; } format.length; format(1); format(1);',
		'function format(value) { return value; } format.call(undefined, 1); format(1); format(1);',
		'function format(value) { return value; } format.apply(undefined, [1]); format(1); format(1);',
		'function format(value) { return value; } format.bind(undefined, 1); format(1); format(1);',
		'let format = value => value; format(1); format(1); format = other;',
		'function format(value) { return arguments[0]; } format(1); format(1);',
		'function format(value) { return (() => arguments[0])(); } format(1); format(1);',
		'const format = value => value; eval(source); format(1); format(1);',
		'function format(value) { return value; } format(...items); format(1); format(1);',
		'function format(value) { return value; } format(0); format(-0);',
		'function format(value) { return value; } format(1); format(1n);',
		'function format(value) { return value; } format(null); format(undefined);',
		'const undefined = 1; function format(value) { return value; } format(); format(undefined);',
		'function format(value) { return value; } format({}); format({});',
		'function format(value) { return value; } format([]); format([]);',
		'function format(value) { return value; } format(/test/); format(/test/);',
		'function format(value) { return value; } format(compute()); format(compute());',
		'function format(value) { return value; } format(void compute()); format(void compute());',
		'let limit = 1; function format(value) { return value; } format(limit); limit++; format(limit);',
		'import {limit} from "limits"; function format(value) { return value; } format(limit); format(limit);',
		'const first = 1; const second = 1; function format(value) { return value; } format(first); format(second);',
		'function format(value) { return value; } { const limit = 1; format(limit); format(limit); }',
		'class Formatter { format(value) { return value; } run() { this.format(1); this.format(1); } }',
		'export class Point { constructor(value) { this.value = value; } } new Point(1); new Point(1);',
		'class Point { constructor(value) { this.value = value; } } class Other extends Point {} new Point(1); new Point(1);',
		'class Formatter { #format(value) { return value; } run() { consume(this.#format); this.#format(1); this.#format(1); } }',
		'class Formatter { #format(value) { return value; } run() { this.#format(1); this.#format(2); } }',
		'function walk(value, callback) { return value ? walk(value.next, other) : callback(value); } walk(first, print); walk(second, print);',
		'function condition(value, allowOr = true) { return value && condition(value.next, false); } condition(first); condition(second);',
		'function walk(value, callback) { callback = other; return value ? walk(value.next, callback) : value; } walk(first, print); walk(second, print);',
		'function walk(value, callback) { return value ? walk(value.next, callback) : callback(value); } walk(first, print);',
		'function walk(node, saved = {}) { return node.next ? walk(node.next, saved) : saved; } walk(first); walk(second);',
		'function walk(node, saved = []) { return node.next ? walk(node.next, saved) : saved; } walk(first); walk(second, undefined);',
		'function walk(node, saved = create()) { return node.next ? walk(node.next, saved) : saved; } walk(first); walk(second);',
		'const walk = function inner(node, saved = new Set()) { return node.next ? inner(node.next, saved) : saved; }; walk(first); walk(second);',
		'const walk = (node, saved = node) => node.next ? walk(node.next, saved) : saved; walk(first); walk(second);',
		'const node = {}; function walk(node, saved = node) { return node.next ? walk(node.next, saved) : saved; } walk(first); walk(second);',
		'class Walker { #walk(node, seen = new Set()) { return node.next ? this.#walk(node.next, seen) : seen; } run() { this.#walk(first); this.#walk(second); } }',
		'class Walker { constructor(node, seen = new Set()) { this.seen = node.next ? new Walker(node.next, seen).seen : seen; } } new Walker(first); new Walker(second);',
		'function walk(node, saved = {}) { return node.next ? walk(node.next, saved) : node.reset ? walk(node.reset) : saved; } walk(first); walk(second, undefined);',
		'function format(...values) { return values; } format(1); format(1);',
		'function format({value}) { return value; } format({value: 1}); format({value: 2});',
		'function format({value}) { return value; } format(options); format(options);',
		'function format({value}) { return value; } format({value: 1, ...other}); format({value: 1});',
		'function format({value}) { return value; } format({value: 1, value: 1}); format({value: 1});',
		'function format({1: value}) { return value; } format({1: 1, "1": 1}); format({1: 1});',
		'function format({value}) { return value; } format({get value() { return 1; }}); format({value: 1});',
		'function format({value}) { return value; } format({[key]: 1}); format({value: 1});',
		'function format({value}) { return value; } format({__proto__: other, value: 1}); format({value: 1});',
		'function format({nested: {value}}) { return value; } format({nested: {value: 1}}); format({nested: {value: 1}});',
		'function format([value]) { return value; } format([1]); format([1]);',
		'function format(value) { return value; } format`literal`; format(1); format(1);',
		{code: 'function format(value) { return value; } format(1); format(1);', languageOptions: {sourceType: 'script'}},
		{code: 'function format(value) { return value; } with (object) { format(1); format(1); }', languageOptions: {sourceType: 'script'}},
		{code: 'function format(value) { return value; } format(1); format(1);', options: [{minimumCallCount: 3}]},
		'function format(value) { return value; } format(onload); format(onload);',
		'function format({[key]: value}) { return value; } format({}); format({});',
		'function format({toString}) { return toString; } format({}); format({});',
		'class Formatter { #format = value => value; run() { this.#format(1); this.#format(1); } }',
	],
	invalid: [
		'function format(value) { return value; } format(1); format(1);',
		'const format = value => value; format(1); format(1);',
		'const format = value => value; eval?.(source); format(1); format(1);',
		'const format = (value) => value; format(1); format(1);',
		'const format = function (value) { return value; }; format(1); format(1);',
		'const format = function inner(value) { return value; }; format(1); format(1);',
		'function format(first, unit, last) { return first + unit + last; } format(1, "px", 2); format(3, "px", 4);',
		'function format(value) { return value; } format("text"); format(\'text\');',
		'function format(value) { return value; } format(16); format(0x10);',
		'function format(value) { return value; } format(-1); format(-0x1);',
		'function format(value) { return value; } format(+1); format(1);',
		'function format(value) { return value; } format(-0); format(-0);',
		'function format(value) { return value; } format(1n); format(0x1n);',
		'function format(value) { return value; } format(-1n); format(-1n);',
		'function format(value) { return value; } format(true); format(true);',
		'function format(value) { return value; } format(false); format(false);',
		'function format(value) { return value; } format(null); format(null);',
		'function format(value) { return value; } format(`text`); format("text");',
		'function format(value) { return value; } format(); format();',
		'function format(value) { return value; } format(); format(undefined);',
		'function format(value) { return value; } format(void 0); format(undefined);',
		'function format(value = false) { return value; } format(); format(false); format(undefined);',
		'function format(value = 1) { return value; } format(2); format(2);',
		'function format(first, second = first, third = second) { return [first, second, third]; } format(1); format(2);',
		'function format(value = create()) { return value; } format(); format(undefined);',
		'function format(value = {}) { return value; } format(); format();',
		'function format(first, second = first) { return first + second; } format(1); format(2);',
		'function format(first, second = first) { second++; return first + second; } format(1); format(2);',
		'const format = (first, second = first) => first + second; format(1); format(2);',
		'async function format(first, second = first) { return first + second; } format(1); format(2);',
		'function * format(first, second = first) { yield first + second; } format(1); format(2);',
		'function format(value) { value++; return value; } format(1); format(1);',
		'const limit = 10; function format(value) { return value; } format(limit); format(limit);',
		'const options = {}; function format(value) { return value; } format(options); format(options);',
		'let limit = 10; function format(value) { return value; } format(limit); format(limit);',
		'const value = 1; function format(value) { return value; } format(value); format(value);',
		'function outer(limit) { function format(value) { return value; } format(limit); format(limit); }',
		'function format(root) { return root; } format(document); format(document);',
		'function format(value) { return value; } format?.(1); format?.(1);',
		'function format(value) { return value; } (format)(1); ((format))(1);',
		'function format(value) { return () => value; } format(1); format(1);',
		'function format(value) { return {value}; } format(1); format(1);',
		'function format(value) { return value.toString(); } format(1); format(1);',
		'function format(value) { return -value; } format(-1); format(-1);',
		{code: 'const format = value => <span>{value}</span>; format(1); format(1);', languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
		{code: 'function render(First, Component = First) { return <Component />; } render(FirstComponent); render(SecondComponent);', languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
		'function format(value) { function other() { return arguments[0]; } return value; } format(1); format(1);',
		'class Point { constructor(x, y, z) { this.point = [x, y, z]; } } new Point(1, 2, 0); new Point(3, 4, 0);',
		'function Point(x, y, z) { this.point = [x, y, z]; } new Point(1, 2, 0); new Point(3, 4, 0);',
		'const Point = class { constructor(value) { this.value = value; } }; new Point(1); new Point(1);',
		'class Formatter { #format(value, unit) { return value + unit; } run() { this.#format(1, "px"); this.#format(2, "px"); } }',
		'export class Formatter { #format(value, unit) { return value + unit; } run() { this.#format(1, "px"); this.#format(2, "px"); } }',
		'class Formatter { static #format(value, unit) { return value + unit; } static run() { this.#format(1, "px"); this.#format(2, "px"); } }',
		'class Formatter { #format(value) { return value; } run(other) { other.#format(1); other.#format(1); } }',
		'class Formatter { #format(value) { return value; } run() { return class Other { run(formatter) { formatter.#format(1); formatter.#format(1); } }; } }',
		outdent`
			class Formatter {
				#format(value) { return value; }
				run() {
					this.#format(1);
					this.#format(1);
					return class Other {
						#format(value) { return value; }
						run() { this.#format(2); this.#format(3); }
					};
				}
			}
		`,
		'function walk(value, callback) { return value ? walk(value.next, callback) : callback(value); } walk(first, print); walk(second, print);',
		'const walk = function inner(value, callback) { return value ? inner(value.next, callback) : callback(value); }; walk(first, print); walk(second, print);',
		'function walk(value, callback) { return value ? walk(value.next, callback) : callback(value); } walk(first, print); walk(second, print); function print(value) { return value; }',
		'function walk(value, unit) { return value ? walk(value.next, "px") : unit; } walk(first, "px"); walk(second, "px");',
		'function format({path, verbose, dryRun = false}) { return [path, verbose, dryRun]; } format({path: "a", verbose: true}); format({path: "b", verbose: true, dryRun: false});',
		'function format({value: renamed}) { return renamed; } format({value: 1}); format({value: 1});',
		'const value = 1; function format({value}) { return value; } format({value}); format({value});',
		'function format({value = 1}) { return value; } format({}); format({value: undefined});',
		'function format({value = 1}) { return value; } format({}); format({value: 1});',
		'function format({first, second = first}) { return [first, second]; } format({first: 1}); format({first: 2});',
		'function format({value}) { return value; } format({}); format({});',
		'function format({value, ...rest}) { return [value, rest]; } format({value: 1, other: 2}); format({value: 1, other: 3});',
		'function format({value = 1} = {}) { return value; } format(); format({});',
		'function format({"unit": unit}) { return unit; } format({unit: "px"}); format({"unit": "px"});',
		'function format({["unit"]: unit}) { return unit; } format({["unit"]: "px"}); format({unit: "px"});',
		'function format({[1]: value}) { return value; } format({[1]: 2}); format({"1": 2});',
		'function format(__proto__) { return {value: __proto__}; } format(1); format(1);',
		'function format(value, other) { return value + other; } format(1, ...items); format(1, 2);',
		'function format(value /* keep */) { return value; } format(1); format(1);',
		'function format(value) { return value; } format(/* keep */ 1); format(1);',
		'function format({value /* keep */}) { return value; } format({value: 1}); format({value: 1});',
		'function format({value}) { return value; } format({value: /* keep */ 1}); format({value: 1});',
		'function format(value) { const limit = 2; return value; } const limit = 1; format(limit); format(limit);',
		'function format(value) { return value; } format(limit); format(limit); const limit = 1;',
		{code: 'function format(value) { return value; } format(1);', options: [{minimumCallCount: 1}]},
		{code: 'function format(value) { return value; } format(1); format(1); format(1);', options: [{minimumCallCount: 3}]},
		{code: 'function outer() { function format(value) { return value; } format(1); format(1); }', languageOptions: {sourceType: 'script'}},
		{code: 'function outer(limit) { "use strict"; function format(value) { return () => value; } format(limit); format(limit); } outer(1);', languageOptions: {sourceType: 'script'}},
		{code: 'function outer() { function format(value) { return delete value; } format(1); format(1); } outer();', languageOptions: {sourceType: 'script'}},
		outdent`
			function format(first, second = first) {
				'use custom directive';
				return first + second;
			}
			format(1);
			format(2);
		`,
		'function format(first, second = first) {\r\n    return first + second;\r\n}\r\nformat(1);\r\nformat(2);',
		'function make(value) { return new Foo(value); } make(1); make(1);',
		'function outer() { let limit; function format(value) { return value; } format(limit); format(limit); }',
		'function format(first, second = first) { "use custom directive"; } format(1); format(2);',
	],
});

testRule.snapshot({
	testerOptions: {languageOptions: {parser: parsers.typescript}},
	valid: [
		'class Formatter { private format(value: number) { return value; } run() { this.format(1); this.format(1); } }',
		'class Formatter { #format(value); #format(value) { return value; } run() { this.#format(1); this.#format(1); } }',
		'class Point { constructor(public value: number) {} } new Point(1); new Point(1);',
		'function format(value) { return value; } format(1); format(1); (eval as any)("format(2)");',
		'function format(value) { return value; } format(1); format(1); eval!("format(2)");',
		'class Point { constructor(@decorate value) { this.value = value; } } new Point(1); new Point(1);',
		'function format(value: number) { return value; } format(1); format(2);',
		'function walk(node, saved = new Set()) { return node.next ? walk(node.next, saved as Set<string>) : saved; } walk(first); walk(second);',
		'function walk(node, saved = node) { return node.next ? walk(node.next, saved!) : saved; } walk(first); walk(second);',
	],
	invalid: [
		'function format(value: number) { return value; } format(1); format(1);',
		'const format: (value: number) => number = value => value; format(1); format(1);',
		'function format<T>(value: T) { return value; } format<number>(1); format<number>(1);',
		'function format(value: number) { return value; } format(1 as number); format(1 satisfies number);',
		'const limit = 1; function format(value: number) { return value; } format(limit!); format(limit as number);',
		'function format(this: void, value: number) { return value; } format(1); format(1);',
		'class Point { constructor(public x: number, value: number) { this.value = value; } } new Point(1, 0); new Point(2, 0);',
		'class Formatter { #format(value: number, unit: string) { return value + unit; } run() { this.#format(1, "px"); this.#format(2, "px"); } }',
		'class Point { constructor(value: number) { this.value = value; } } let point: Point; new Point(1); new Point(1);',
		'function format(value) { return value; } type Signature = typeof format; format(1); format(1);',
		'function format(value) { <string>value; return value; } format("use strict"); format("use strict");',
		{code: 'function outer() { function format(value) { return delete (<number>value); } format(1); format(1); } outer();', languageOptions: {sourceType: 'script'}},
		'function format(value) { return value; } type Length = typeof format.length; format(1); format(1);',
	],
});

const config = {
	languageOptions: {ecmaVersion: 'latest'},
	plugins: {unicorn: plugin},
	rules: {'unicorn/no-unnecessary-parameters': 'error'},
};

const linter = new Linter();

for (const {parser, openingTag, template} of [
	{parser: parsers.vue, openingTag: '<script setup>', template: '<template>{{ format(2) }}</template>'},
	{parser: parsers.svelte, openingTag: '<script>', template: '{format(2)}'},
]) {
	const filename = `input.${parser.name}`;
	const componentConfig = {
		...config,
		files: [`**/*.${parser.name}`],
		languageOptions: {parser: parser.implementation},
	};
	const code = `${openingTag}function format(value) { return value; } format(1); format(1);</script>`;

	test(`fixes unnecessary parameters in ${parser.name} JavaScript scripts`, t => {
		const result = linter.verifyAndFix(code, componentConfig, {filename});
		t.assert.strictEqual(result.fixed, true);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(result.output, `${openingTag}function format() { return 1; } format(); format();</script>`);
	});

	test(`keeps parameters of functions used in ${parser.name} templates`, t => {
		const component = code + template;
		const result = linter.verifyAndFix(component, componentConfig, {filename});
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, component);
		t.assert.deepStrictEqual(result.messages, []);
	});

	test(`preserves type checking pragmas in ${parser.name} JavaScript scripts`, t => {
		const script = '// @ts-check\nfunction format(value) { let result = value; result = "text"; return result; } [format(1), format(1)];';
		const component = `${openingTag}${script}</script>`;
		t.assert.deepStrictEqual(getJavaScriptTypeErrors(script), []);
		const result = linter.verifyAndFix(component, componentConfig, {filename});
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, component);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		t.assert.strictEqual(result.messages[0].messageId, 'same-value');
		t.assert.deepStrictEqual(structuredClone(vm.runInNewContext(script)), ['text', 'text']);
	});

	test(`reports unnecessary parameters in ${parser.name} TypeScript scripts without fixing`, t => {
		const component = code.replace('<script', '<script lang="ts"').replace('format(value)', 'format(value: number)');
		const result = linter.verifyAndFix(component, {
			...componentConfig,
			languageOptions: {
				parser: parser.implementation,
				parserOptions: {parser: parsers.typescript.implementation},
			},
		}, {filename});
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, component);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		t.assert.strictEqual(result.messages[0].messageId, 'same-value');
	});
}

test('reports JavaScript parameters with a TypeScript program without fixing', t => {
	const code = 'function format(value) { return value; } [format(1), format(1)];';
	const filename = path.join(import.meta.dirname, 'no-unnecessary-parameters.type-aware.js');
	const parser = {
		...parsers.typescript.implementation,
		parseForESLint(...arguments_) {
			const result = parsers.typescript.implementation.parseForESLint(...arguments_);
			t.assert.ok(result.services.program);
			return result;
		},
	};
	const result = linter.verifyAndFix(code, {
		...config,
		languageOptions: {
			parser,
			parserOptions: {
				projectService: {allowDefaultProject: ['no-unnecessary-parameters.type-aware.js']},
				tsconfigRootDir: import.meta.dirname,
			},
		},
	}, {filename});
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
	t.assert.strictEqual(result.messages[0].messageId, 'same-value');
});

function getJavaScriptTypeErrors(code) {
	const filename = path.join(import.meta.dirname, 'no-unnecessary-parameters.fixture.js');
	const options = {
		allowJs: true,
		checkJs: true,
		noEmit: true,
		noImplicitAny: false,
		target: ts.ScriptTarget.ESNext,
		module: ts.ModuleKind.ESNext,
		lib: ['lib.esnext.d.ts'],
		types: [],
		skipLibCheck: true,
	};
	const host = ts.createCompilerHost(options);
	const originalReadFile = host.readFile.bind(host);
	host.readFile = path => path === filename ? code : originalReadFile(path);
	const program = ts.createProgram([filename], options, host);
	return ts.getPreEmitDiagnostics(program).map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
}

test('preserves JavaScript type annotations when reporting unnecessary parameters', t => {
	for (const code of [
		'/** @param {number} value */ function format(value) { return value.toFixed(); } [format(1), format(1)];',
		'/** Format a value. @param {number} value */ function format(value) { return value.toFixed(); } [format(1), format(1)];',
		'/** @type {(value: number) => string} */ const format = value => value.toFixed(); [format(1), format(1)];',
		'// @ts-check\nfunction format(value) { let result = value; result = "text"; return result; } [format(1), format(1)];',
		'#!/usr/bin/env node\n/* @ts-check */\nfunction format(value) { let result = value; result = "text"; return result; } [format(1), format(1)];',
	]) {
		t.assert.deepStrictEqual(getJavaScriptTypeErrors(code), []);
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		t.assert.deepStrictEqual(getJavaScriptTypeErrors(result.output), []);
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), JSON.stringify(vm.runInNewContext(code)));
	}
});

test('preserves TypeScript checking pragma spellings', t => {
	for (const directive of ['/// @ts-check', '// @TS-CHECK']) {
		const code = `${directive}\nfunction format(value) { let result = value; result = "text"; return result; } [format(1), format(1)];`;
		const sourceFile = ts.createSourceFile('input.js', code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
		t.assert.strictEqual(sourceFile.checkJsDirective?.enabled, true);
		t.assert.deepStrictEqual(getJavaScriptTypeErrors(code), []);
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		t.assert.strictEqual(result.messages[0].messageId, 'same-value');
		t.assert.deepStrictEqual(getJavaScriptTypeErrors(result.output), []);
		t.assert.deepStrictEqual(structuredClone(vm.runInNewContext(result.output)), ['text', 'text']);
	}
});

test('preserves inline JSDoc casts when reporting unnecessary parameters', t => {
	for (const declaration of ['value => value', 'function (value) { return value; }']) {
		const code = `const format = /** @type {(value: number) => number} */ (${declaration}); [format(1), format(1)];`;
		t.assert.deepStrictEqual(getJavaScriptTypeErrors(code), []);
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		t.assert.strictEqual(result.messages[0].messageId, 'same-value');
		t.assert.deepStrictEqual(getJavaScriptTypeErrors(result.output), []);
		t.assert.deepStrictEqual(structuredClone(vm.runInNewContext(result.output)), [1, 1]);
	}
});

test('preserves separated JSDoc parameter annotations', t => {
	for (const gap of ['\n\n', '\n// Format a value.\n']) {
		const code = `/** @param {number} value */${gap}function format(value) { return value; } [format(1), format(1)];`;
		t.assert.deepStrictEqual(getJavaScriptTypeErrors(code), []);
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		t.assert.strictEqual(result.messages[0].messageId, 'same-value');
		t.assert.deepStrictEqual(getJavaScriptTypeErrors(result.output), []);
		t.assert.deepStrictEqual(structuredClone(vm.runInNewContext(result.output)), [1, 1]);
	}
});

test('requires manual fixes throughout files containing JSDoc signature annotations', t => {
	const code = 'function format(value) { return value; } /** @param {string} text */ function describe(text) { return text; } describe("example"); [format(1), format(1)];';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
	t.assert.strictEqual(result.messages[0].messageId, 'same-value');
	t.assert.deepStrictEqual(structuredClone(vm.runInNewContext(result.output)), [1, 1]);
});

test('preserves constructor signatures and inferred property types', t => {
	for (const code of [
		'/** @type {new (value: number) => {value: number}} */ const Point = class { constructor(value) { this.value = value; } }; [new Point(1).value, new Point(1).value];',
		'/** @constructor */ function Point(value) { this.value = value; } const first = new Point(1); const second = new Point(1); first.value = "text"; [first.value, second.value];',
		'/** @class */ function Point(value) { this.value = value; } const first = new Point(1); const second = new Point(1); first.value = "text"; [first.value, second.value];',
	]) {
		t.assert.deepStrictEqual(getJavaScriptTypeErrors(code), []);
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		t.assert.strictEqual(result.messages[0].messageId, 'same-value');
		t.assert.deepStrictEqual(getJavaScriptTypeErrors(result.output), []);
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), JSON.stringify(vm.runInNewContext(code)));
	}
});

test('reports constructor parameters without fixing even without annotations', t => {
	for (const code of [
		'class Point { constructor(value) { this.value = value; } } [new Point(1).value, new Point(1).value];',
		'function Point(value) { this.value = value; } [new Point(1).value, new Point(1).value];',
		'const Point = class Inner { constructor(value) { this.value = value; } }; [new Point(1).value, new Point(1).value];',
		'function create(value) { return {value}; } [create(1).value, new create(1).value];',
	]) {
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		t.assert.strictEqual(result.messages[0].messageId, 'same-value');
		t.assert.deepStrictEqual(structuredClone(vm.runInNewContext(result.output)), [1, 1]);
	}
});

test('reports parameters with JSDoc aliases and declaration annotations without fixing', t => {
	for (const code of [
		'/** @arg {number} value */ function format(value) { return value; } format(1); format(1);',
		'/** @argument {number} value */ function format(value) { return value; } format(1); format(1);',
		'/** @param {number} value */ const format = function (value) { return value; }; format(1); format(1);',
		'class Formatter { /** @param {number} value */ #format(value) { return value; } run() { this.#format(1); this.#format(1); } }',
	]) {
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		t.assert.strictEqual(result.messages[0].messageId, 'same-value');
	}
});

test('fixes parameters beside ordinary comments and descriptive JSDoc', t => {
	for (const comment of [
		'// Format a value.',
		'/* Format a value. */',
		'/** Format a value. */',
		'/** @deprecated Use another formatter. */',
		'// @param value',
		'/* @param value */',
		'// This example mentions @ts-check.',
	]) {
		const code = `${comment}\nfunction format(value) { return value; } [format(1), format(1)];`;
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, true);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.ok(result.output.startsWith(comment));
		t.assert.deepStrictEqual(structuredClone(vm.runInNewContext(result.output)), [1, 1]);
	}
});

test('requires manual fixes when checking pragmas appear after code has started', t => {
	for (const code of [
		'const marker = 0;\n// @ts-check\nfunction format(value) { return value; } [format(1), format(1)];',
		'function format(value) { /* @ts-check */ return value; } [format(1), format(1)];',
	]) {
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		t.assert.strictEqual(result.messages[0].messageId, 'same-value');
		t.assert.deepStrictEqual(structuredClone(vm.runInNewContext(result.output)), [1, 1]);
	}
});

test('ignores fresh defaults forwarded through recursive calls', t => {
	const code = outdent`
		const graph = {a: 'b', b: 'a'};

		function walk(node, seen = new Set()) {
			if (seen.has(node)) {
				return node;
			}

			seen.add(node);
			return walk(graph[node], seen);
		}

		walk('a');
		walk('b');
	`;
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.deepStrictEqual(result.messages, []);
});

test('keeps fresh defaults shared within recursion and separate between calls', t => {
	const code = outdent`
		function walk(node, seen = new Set()) {
			seen.add(node.value);
			return node.next ? walk(node.next, seen) : seen;
		}
		const sets = [
			walk({value: 1, next: {value: 2}}),
			walk({value: 3, next: {value: 4}}, undefined),
		];
		[sets.map(set => [...set]), sets[0] === sets[1]];
	`;
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.deepStrictEqual(structuredClone(vm.runInNewContext(result.output)), [[[1, 2], [3, 4]], false]);
});

test('fixes multiple parameters across successive passes', t => {
	const code = 'function format(first, second, third) { return [first, second, third]; } format(1, 2, 3); format(1, 2, 3);';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.match(result.output, /function format\(\)/);
	t.assert.match(result.output, /format\(\); format\(\);$/);
	t.assert.strictEqual(linter.verifyAndFix(result.output, config).fixed, false);
});

test('fixes literal and recursive arguments while reporting constructor parameters', t => {
	const code = outdent`
		function format(value, unit) {
			return value + unit;
		}
		class Point {
			constructor(x, y, z) {
				this.point = [x, y, z];
			}
		}
		function walk(value, unit) {
			return value.next ? walk(value.next, unit) : value.value + unit;
		}
		[
			format(1, 'px'),
			format(2, 'px'),
			new Point(1, 2, 0).point,
			new Point(3, 4, 0).point,
			walk({next: {value: 1}}, 'px'),
			walk({value: 2}, 'px'),
		];
	`;
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
	t.assert.strictEqual(result.messages[0].messageId, 'same-value');
	t.assert.strictEqual(result.messages[0].message, 'Parameter `z` receives the same value at every call.');
	t.assert.match(result.output, /constructor\(x, y, z\)/);
	t.assert.ok(result.output.includes('new Point(1, 2, 0).point'));
	t.assert.ok(result.output.includes('new Point(3, 4, 0).point'));
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), JSON.stringify(vm.runInNewContext(code)));
});

test('preserves object rest while removing a destructured property', t => {
	const code = 'function format({value, ...rest}) { return [value, rest]; } [format({value: 1, other: 2}), format({value: 1, other: 3})];';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), JSON.stringify(vm.runInNewContext(code)));
});

test('preserves earlier-parameter defaults and parameter mutation', t => {
	const code = 'function format(first, second = first) { second++; return [first, second]; } [format(1), format(2)];';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), JSON.stringify(vm.runInNewContext(code)));
});

test('does not inline a callback into a direct eval call', t => {
	const code = 'function format(callback) { const secret = 1; return callback("typeof secret"); } format(eval); format(eval);';
	const result = linter.verifyAndFix(code, {...config, languageOptions: {globals: {eval: 'readonly'}}});
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(vm.runInNewContext(result.output), 'undefined');
});

test('keeps a default that reads a parameter shadowed by a body variable', t => {
	const code = 'function format(first, second = first) { var first = 10; return second; } [format(1), format(2)];';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,2]');
});

test('keeps parameter bindings redeclared in the body', t => {
	for (const [code, expected] of [
		['function format(value = 1) { var value; return value; } [format(), format()];', '[1,1]'],
		['function format({value}) { var value; return value; } [format({value: 1}), format({value: 1})];', '[1,1]'],
		['function format(first, second = first) { var second; return second; } [format(1), format(2)];', '[1,2]'],
		['function format(first, second = first) { function second() { return 10; } return second(); } [format(1), format(2)];', '[10,10]'],
	]) {
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), expected);
	}
});

test('does not move fresh default values into a generator body', t => {
	const code = 'let count = 0; function * format(value = ++count) { yield value; } const first = format(); const second = format(); [count, first.next().value, second.next().value];';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[2,1,2]');
});

test('keeps comments in ranges removed by positional fixes', t => {
	const code = 'function format(value /* signature */) { return value; } format(/* argument */ 1); format(1);';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
});

test('keeps distinct object identities from default initializers', t => {
	const code = 'function format(value = {}) { return value; } const values = [format(), format()]; values[0] === values[1];';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(vm.runInNewContext(result.output), false);
});

test('reports readonly globals without replacing argument snapshots', t => {
	const code = 'function format(root) { return () => root; } format(document); format(document);';
	const result = linter.verifyAndFix(code, {...config, languageOptions: {globals: {document: 'readonly'}}});
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.messages.length, 1);
});

test('does not turn a replaced parameter into a strict-mode directive', t => {
	const code = 'function format(value) { value; return this === undefined; } [format("use strict"), format("use strict")];';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), JSON.stringify(vm.runInNewContext(code)));
});

test('preserves statement boundaries before a parenthesized numeric receiver', t => {
	const code = outdent`
		function consume() {}
		function format(value) {
			consume()
			value.toString();
			return value;
		}
		[format(1), format(1)];
	`;
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), JSON.stringify(vm.runInNewContext(code)));
});

test('parenthesizes negative literals on the left of exponentiation', t => {
	const code = 'function square(value) { return value ** 2; } [square(-2), square(-2)];';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(result.output, 'function square() { return (-2) ** 2; } [square(), square()];');
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[4,4]');
});

test('preserves rest arguments when removing a middle parameter', t => {
	const code = 'function format(first, unit, ...rest) { return [first, unit, rest]; } [format(1, "px", 2), format(3, "px", 4, 5)];';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), JSON.stringify(vm.runInNewContext(code)));
});

test('keeps the original earlier-parameter snapshot across recursive forwarding', t => {
	const code = 'function walk(node, saved = node) { return node.next ? walk(node.next, saved) : saved.value; } [walk({value: 1, next: {value: 2}}), walk({value: 3, next: {value: 4}})];';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,3]');
});

test('still reports recursive defaults referring to stable outer bindings', t => {
	const code = 'const saved = {}; function walk(node, state = saved) { return node.next ? walk(node.next, state) : state; } walk(first); walk(second, undefined);';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].messageId, 'always-default');
});

test('checks explicit recursive arguments independently of complex defaults', t => {
	const declaration = 'function walk(node, saved = new Set()) { return node.next ? walk(node.next, saved) : saved; }';
	const code = `${declaration} [walk({next: {}}, 1), walk({}, 1)];`;
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.deepStrictEqual(structuredClone(vm.runInNewContext(result.output)), [1, 1]);

	const mixedCode = `${declaration} const results = [walk({next: {}}), walk({}, 1)]; [results[0] instanceof Set, results[1]];`;
	const mixedResult = linter.verifyAndFix(mixedCode, config);
	t.assert.strictEqual(mixedResult.fixed, false);
	t.assert.strictEqual(mixedResult.output, mixedCode);
	t.assert.deepStrictEqual(mixedResult.messages, []);
	t.assert.deepStrictEqual(structuredClone(vm.runInNewContext(mixedResult.output)), [true, 1]);
});

test('preserves mutable outer binding snapshots across recursive forwarding', t => {
	const code = outdent`
		let current = 0;
		function walk(node, saved = current) {
			current++;
			return node.next ? walk(node.next, saved) : saved;
		}
		[walk({next: {}}), walk({})];
	`;
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.deepStrictEqual(structuredClone(vm.runInNewContext(result.output)), [0, 2]);
});

test('preserves results when fixing primitive defaults and undefined across recursive forwarding', t => {
	for (const parameter of ['unit = "px"', 'unit']) {
		const code = `function walk(node, ${parameter}) { return node.next ? walk(node.next, unit) : [node.value, unit]; } [walk({next: {value: 1}}), walk({value: 2})];`;
		const messages = linter.verify(code, config);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].messageId, parameter.includes('=') ? 'always-default' : 'always-undefined');
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, true);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.deepStrictEqual(structuredClone(vm.runInNewContext(result.output)), structuredClone(vm.runInNewContext(code)));
	}
});

test('still reports primitive defaults forwarded through TypeScript wrappers', t => {
	const code = 'function walk(node, unit = "px" as string) { return node.next ? walk(node.next, (unit as string)!) : [node.value, unit]; } walk(first); walk(second);';
	const result = linter.verifyAndFix(code, {...config, languageOptions: {parser: parsers.typescript.implementation}});
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].messageId, 'always-default');
});

test('fixes a parameter with the same name as a stable outer binding', t => {
	const code = 'const value = 1; function format(value) { return value; } [format(value), format(value)];';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.match(result.output, /function format\(\)/);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
});

test('fixes shorthand object arguments with the same name as an outer binding', t => {
	const code = 'const value = 1; function format({value}) { return value; } [format({value}), format({value})];';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
});

test('does not remove snapshots from async and generator signatures', t => {
	for (const declaration of ['async function', 'function *']) {
		const code = `${declaration} format(first, second = first) { return first + second; } format(1); format(2);`;
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.messages.length, 1);
	}
});

test('skips own arguments in named function expressions and their arrows', t => {
	for (const body of ['return arguments[0];', 'return (() => arguments[0])();']) {
		const code = `const format = function inner(value) { ${body} }; [format(1), format(1)];`;
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, false);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
	}
});

test('fixes arrows using an enclosing function arguments object', t => {
	const code = outdent`
		function outer(input) {
			const format = value => [value, arguments[0]];
			return [format(1), format(1)];
		}
		[outer(2), outer(3)];
	`;
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.match(result.output, /const format = \(\) => \[1, arguments\[0\]\]/);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[[[1,2],[1,2]],[[1,3],[1,3]]]');
});

test('avoids overlapping edits while expanding a recursive concise arrow', t => {
	const code = 'const format = (first, second = first) => first ? format(0, undefined) : second; [format(1), format(2)];';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[0,0]');
});

test('preserves a class argument temporal dead zone before entering the function', t => {
	const code = outdent`
		let count = 0;
		function format(value) {
			count++;
			return value;
		}
		try { format(Point); } catch {}
		try { format(Point); } catch {}
		class Point {}
		count;
	`;
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(vm.runInNewContext(result.output), 0);
});

test('keeps parameter snapshots when a var initializer executes repeatedly', t => {
	const code = outdent`
		function format(value) {
			return () => value;
		}
		const callbacks = [];
		for (var limit of [1, 2]) {
			callbacks.push(format(limit), format(limit));
		}
		callbacks.map(callback => callback());
	`;
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1,2,2]');
});

test('preserves a parameter temporal dead zone in an earlier initializer', t => {
	const code = outdent`
		let count = 0;
		function format(first = second, second) {
			count++;
			return second;
		}
		try { format(undefined, 1); } catch {}
		try { format(undefined, 1); } catch {}
		count;
	`;
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.messages.length, 2);
	t.assert.strictEqual(vm.runInNewContext(result.output), 0);
});

test('keeps omitted defaults in parameter scope before the body runs', t => {
	for (const [parameter, declaration] of [
		['value = limit', 'const limit = 1;'],
		['{value = limit} = {}', 'const limit = 1;'],
		['value = Point', 'class Point {}'],
	]) {
		const code = `let count = 0; function format(${parameter}) { count++; return value; } try { format(); } catch {} try { format(); } catch {} ${declaration} count;`;
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(vm.runInNewContext(result.output), 0);
	}
});

test('keeps JSX tag parameters intact', t => {
	const jsxConfig = {...config, languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}};
	for (const code of [
		'function render(Component) { return <Component />; } render("a"); render("a");',
		'function render(Component) { return <Component.Member></Component.Member>; } render("a"); render("a");',
		'const component = () => null; function render(Component) { return <Component />; } render(component); render(component);',
	]) {
		const result = linter.verifyAndFix(code, jsxConfig);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
	}
});

test('keeps binding snapshots in callers with independent execution timing', t => {
	const code = outdent`
		let count = 0;
		function format(value) {
			count++;
			return value;
		}
		try { invoke(); } catch {}
		const limit = 1;
		function invoke() {
			format(limit);
			format(limit);
		}
		count;
	`;
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(vm.runInNewContext(result.output), 0);
});

test('keeps outer parameter snapshots when arguments can mutate the binding', t => {
	const code = outdent`
		function outer(limit) {
			function format(value) {
				return () => value;
			}
			const callbacks = [format(limit), format(limit)];
			arguments[0] = 2;
			return callbacks.map(callback => callback());
		}
		outer(1);
	`;
	const result = linter.verifyAndFix(code, {...config, languageOptions: {sourceType: 'script'}});
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
});

test('preserves an earlier-parameter snapshot before its source is mutated', t => {
	const code = 'function format(first, second = first) { first++; return [first, second]; } [format(1), format(2)];';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[[2,1],[3,2]]');
});

test('preserves default snapshots before super mutates an earlier parameter', t => {
	const code = outdent`
		class Base {
			constructor(mutate) {
				mutate();
			}
		}
		class Point extends Base {
			constructor(first, second = first) {
				super(() => first++);
				this.values = [first, second];
			}
		}
		[new Point(1).values, new Point(2).values];
	`;
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
	t.assert.strictEqual(result.messages[0].messageId, 'always-default');
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[[2,1],[3,2]]');
});

test('does not introduce a strict directive after stripping TypeScript wrappers', t => {
	const typescriptConfig = {...config, languageOptions: {parser: parsers.typescript.implementation, sourceType: 'script'}};
	for (const expression of ['value as string', 'value satisfies string', 'value!', '(value as string)!']) {
		const code = `function outer() { function format(value) { ${expression}; return this === undefined; } return [format("use strict"), format("use strict")]; } outer();`;
		const result = linter.verifyAndFix(code, typescriptConfig);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		const javascript = stripTypeScriptTypes(result.output);
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(javascript)), '[false,false]');
	}
});

test('keeps shorthand prototype keys as own properties', t => {
	for (const code of [
		'function format(__proto__) { return {__proto__}; } [format(1), format(1)];',
		'const options = {}; function format(__proto__) { return {__proto__}; } [format(options), format(options)];',
		'function format({value: __proto__}) { return {__proto__}; } [format({value: 1}), format({value: 1})];',
	]) {
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), JSON.stringify(vm.runInNewContext(code)));
	}
});

test('ignores explicit arguments parameter bindings', t => {
	for (const [parameter, argument] of [['arguments', 'arguments'], ['{value: arguments}', '{value: arguments}']]) {
		const code = `function outer() { const arguments = 1; function format(${parameter}) { return arguments; } return [format(${argument}), format(${argument})]; } outer();`;
		const result = linter.verifyAndFix(code, {...config, languageOptions: {sourceType: 'script'}});
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
	}
});

test('does not inline binding names with context-dependent syntax', t => {
	for (const code of [
		'function outer() { const await = 1; async function format(value) { return value; } format(await); format(await); } outer();',
		'function outer() { const yield = 1; function * format(value) { return value; } format(yield); format(yield); } outer();',
		'function outer() { function package() {} function format(value) { "use strict"; return value; } format(package); format(package); } outer();',
	]) {
		const result = linter.verifyAndFix(code, {...config, languageOptions: {sourceType: 'script'}});
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
	}
});

test('keeps delete operations on TypeScript-wrapped parameter references', t => {
	const typescriptConfig = {...config, languageOptions: {parser: parsers.typescript.implementation, sourceType: 'script'}};
	for (const expression of ['value as any', 'value satisfies number', 'value!', '(value as any)!']) {
		const code = `function outer() { function format(value) { return delete (${expression}); } return [format(1), format(1)]; } outer();`;
		const result = linter.verifyAndFix(code, typescriptConfig);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		const javascript = stripTypeScriptTypes(result.output);
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(javascript)), '[false,false]');
	}
});

test('keeps literals in their original strictness context', t => {
	for (const literal of ['010', '08', '-010', '+010', String.raw`"\1"`, String.raw`"\8"`]) {
		for (const [declaration, call, suffix] of [
			['function format(value) { "use strict"; return value; }', 'format', ''],
			['function format(value) { return function read() { "use strict"; return value; }; }', 'format', '()'],
			['function format(value) { return class Inner { static value = value; }; }', 'format', '.value'],
		]) {
			const code = `function outer() { ${declaration} return [${call}(${literal})${suffix}, ${call}(${literal})${suffix}]; } outer();`;
			const result = linter.verifyAndFix(code, {...config, languageOptions: {sourceType: 'script'}});
			t.assert.strictEqual(result.fixed, false);
			t.assert.strictEqual(result.output, code);
			t.assert.strictEqual(result.messages.length, 1);
			t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
			t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), JSON.stringify(vm.runInNewContext(code)));
		}
	}
});

test('keeps reserved parameter names out of local default declarations', t => {
	for (const body of ['return let;', 'let++; return let;']) {
		const code = `function outer() { function format(first, let = first) { ${body} } return [format(1), format(2)]; } outer();`;
		const result = linter.verifyAndFix(code, {...config, languageOptions: {sourceType: 'script'}});
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), body.startsWith('let++') ? '[2,3]' : '[1,2]');
	}
});

test('ignores TypeScript bindings initialized by enum and namespace declarations', t => {
	const typescriptConfig = {...config, languageOptions: {parser: parsers.typescript.implementation}};
	for (const declaration of ['enum Options { value }', 'namespace Options { export const value = 1; }']) {
		for (const calls of [
			`const callbacks = [format(Options), format(Options)]; ${declaration}`,
			`const callbacks = [format(Options)]; ${declaration} callbacks.push(format(Options));`,
		]) {
			const code = `function format(value) { return () => value; } ${calls} callbacks.map(callback => callback());`;
			const result = linter.verifyAndFix(code, typescriptConfig);
			t.assert.strictEqual(result.fixed, false);
			t.assert.strictEqual(result.output, code);
			t.assert.deepStrictEqual(result.messages, []);
		}
	}
});

test('ignores sloppy block declarations with implicit outer aliases', t => {
	for (const block of [
		'{ function format(value) { return value; } results = [format(1), format(1)]; }',
		'if (true) { function format(value) { return value; } results = [format(1), format(1)]; }',
		'switch (1) { case 1: function format(value) { return value; } results = [format(1), format(1)]; }',
	]) {
		const code = `function outer() { let results; ${block} results.push(format(2)); return results; } outer();`;
		const result = linter.verifyAndFix(code, {...config, languageOptions: {sourceType: 'script'}});
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1,2]');
	}
});

test('still fixes strict block declarations and sloppy block function expressions', t => {
	for (const [declaration, directive] of [
		['function format(value) { return value; }', '"use strict";'],
		['const format = value => value;', ''],
	]) {
		const code = `function outer() { ${directive} { ${declaration} return [format(1), format(1)]; } } outer();`;
		const result = linter.verifyAndFix(code, {...config, languageOptions: {sourceType: 'script'}});
		t.assert.strictEqual(result.fixed, true);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
	}
});

test('reports stable catch bindings without inlining', t => {
	const code = 'try { throw 1; } catch (limit) { const format = value => value; [format(limit), format(limit)]; }';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
});

test('ignores decorated class expressions', t => {
	const typescriptConfig = {...config, languageOptions: {parser: parsers.typescript.implementation}};
	for (const initializer of [
		'@decorate class { constructor(value) { this.value = value; } }',
		'(@decorate class { constructor(value) { this.value = value; } })',
		'(@decorate class { constructor(value) { this.value = value; } }) as any',
		'@decorate class Inner { constructor(value) { this.value = value; } }',
	]) {
		const code = `const Point = ${initializer}; new Point(1); new Point(1);`;
		const result = linter.verifyAndFix(code, typescriptConfig);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.deepStrictEqual(result.messages, []);
	}
});

test('keeps comments in place when reporting earlier-parameter defaults', t => {
	for (const body of [
		'// opening comment\nreturn second;',
		'"custom"; // directive comment\nreturn second;',
		'/* body comment */ return second;',
	]) {
		const code = `function format(first, second = first) { ${body} } [format(1), format(2)];`;
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,2]');
	}
});

test('still fixes primitive references beside body comments', t => {
	const code = 'function format(value) { /* keep */ return value; } [format(1), format(1)];';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(result.output, 'function format() { /* keep */ return 1; } [format(), format()];');
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
});

test('ignores own arguments objects with var redeclarations', t => {
	for (const declaration of ['var arguments;', 'var arguments = arguments;']) {
		for (const expression of ['arguments[0]', '(() => arguments[0])()']) {
			const code = `function outer() { function format(value) { ${declaration} return ${expression}; } return [format(1), format(1)]; } outer();`;
			const result = linter.verifyAndFix(code, {...config, languageOptions: {sourceType: 'script'}});
			t.assert.strictEqual(result.fixed, false);
			t.assert.strictEqual(result.output, code);
			t.assert.deepStrictEqual(result.messages, []);
			t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
		}
	}
});

test('ignores ambient declaration bindings', t => {
	const typescriptConfig = {...config, languageOptions: {parser: parsers.typescript.implementation}};
	for (const declaration of ['declare function callback(): number;', 'declare class callback {}', 'declare const callback: () => number;', 'declare let callback: () => number;']) {
		const code = `${declaration} function format(value) { return () => value; } const values = [format(callback), format(callback)]; globalThis.callback = () => 2; values.map(get => get()());`;
		const result = linter.verifyAndFix(code, typescriptConfig);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.deepStrictEqual(result.messages, []);
		const javascript = stripTypeScriptTypes(result.output);
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(javascript, {callback: () => 1})), '[1,1]');
	}
});

test('keeps argument reads before body effects for uninitialized switch bindings', t => {
	for (const declaration of ['const limit = 1;', 'let limit = 1;', 'class limit {}']) {
		const code = outdent`
			let count = 0;
			switch (1) {
				case 0:
					${declaration}
					break;
				case 1:
					const format = value => { count++; return value; };
					try { format(limit); } catch {}
					try { format(limit); } catch {}
			}
			count;
		`;
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		t.assert.strictEqual(vm.runInNewContext(result.output), 0);
	}
});

test('still fixes hoisted function bindings from other switch cases', t => {
	const code = 'switch (1) { case 0: function limit() { return 1; } break; case 1: const format = value => value(); [format(limit), format(limit)]; }';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
});

test('keeps argument reads before body effects in outer parameter initializers', t => {
	const code = outdent`
		let count = 0;
		function outer(first = (() => {
			const format = value => { count++; return value; };
			try { format(second); } catch {}
			try { format(second); } catch {}
		})(), second) {}
		outer();
		count;
	`;
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
	t.assert.strictEqual(vm.runInNewContext(result.output), 0);
});

test('keeps argument reads before body effects in catch binding initializers', t => {
	const code = outdent`
		let count = 0;
		try { throw {}; } catch ({first = (() => {
			const format = value => { count++; return value; };
			try { format(second); } catch {}
			try { format(second); } catch {}
		})(), second}) {}
		count;
	`;
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
	t.assert.strictEqual(vm.runInNewContext(result.output), 0);
});

test('reports TypeScript earlier-parameter defaults without changing assertions', t => {
	const typescriptConfig = {...config, languageOptions: {parser: parsers.typescript.implementation}};
	const code = 'function format(first = 1 as string | number, second = first as number) { return second.toFixed(); } [format(1), format(2)];';
	const result = linter.verifyAndFix(code, typescriptConfig);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
	const javascript = stripTypeScriptTypes(result.output);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(javascript)), '["1","2"]');
});

test('keeps snapshots of script bindings mutated through the global object', t => {
	const code = outdent`
		function limit() { return 1; }
		function outer() {
			function format(value) { return () => value; }
			const callbacks = [format(limit), format(limit)];
			globalThis.limit = () => 2;
			return callbacks.map(get => get()());
		}
		outer();
	`;
	const result = linter.verifyAndFix(code, {...config, languageOptions: {sourceType: 'script'}});
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
});

test('fixes recursive calls inside removed defaults without overlapping edits', t => {
	for (const code of [
		'function format(value = format(1)) { return value; } [format(1), format(1)];',
		'function format(value = format(value)) { return value; } [format(1), format(1)];',
		'function format({value = format({value: 1})}) { return value; } [format({value: 1}), format({value: 1})];',
	]) {
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, true);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(code)), '[1,1]');
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
	}
});

test('keeps snapshots of function bindings reassigned by sloppy block declarations', t => {
	const code = outdent`
		function outer() {
			function limit() { return 1; }
			function format(value) { return () => value; }
			const callbacks = [format(limit), format(limit)];
			{ function limit() { return 2; } }
			return callbacks.map(get => get()());
		}
		outer();
	`;
	const result = linter.verifyAndFix(code, {...config, languageOptions: {sourceType: 'script'}});
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(code)), '[1,1]');
	t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
});

test('ignores callers redirected by sloppy block function declarations', t => {
	for (const directive of ['', '"use strict";']) {
		const code = outdent`
			function outer() {
				function format(value) { return value; }
				const first = format(1);
				{ function format(value) { ${directive} return value + 1; } }
				return [first, format(1)];
			}
			outer();
		`;
		const result = linter.verifyAndFix(code, {...config, languageOptions: {sourceType: 'script'}});
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(code)), '[1,2]');
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,2]');
	}
});

test('resolves private calls in class heritage using the enclosing class', t => {
	for (const declaration of ['class Inner', 'const Inner = class']) {
		const code = outdent`
			class Outer {
				#format(value) { return class { static value = value; }; }
				run() {
					const first = this.#format(1);
					const second = this.#format(1);
					${declaration} extends this.#format(2) {
						#format(value) { return value; }
						run() { return [this.#format(3), this.#format(4)]; }
					}
					return [first.value, second.value, Inner.value];
				}
			}
			new Outer().run();
		`;
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(code)), '[1,1,2]');
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1,2]');
		const matchingCode = code.replace('extends this.#format(2)', 'extends this.#format(1)');
		const matchingResult = linter.verifyAndFix(matchingCode, config);
		t.assert.strictEqual(matchingResult.fixed, true);
		t.assert.deepStrictEqual(matchingResult.messages, []);
		t.assert.match(matchingResult.output, /extends this\.#format\(\)/);
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(matchingCode)), '[1,1,1]');
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(matchingResult.output)), '[1,1,1]');
	}
});

test('reports TypeScript parameters without changing inferred or asserted types', t => {
	const typescriptConfig = {...config, languageOptions: {parser: parsers.typescript.implementation}};
	for (const code of [
		'function format(value = 1 as string | number) { return typeof value === "number" ? value.toFixed() : value.toUpperCase(); } [format(1), format(1)];',
		'function format(value) { return value; } [(format as (value: number) => number)(1), (format as (value: number) => number)(1)];',
		'function format({value}) { return value; } [format({value: 1} satisfies {value: number}), format({value: 1} satisfies {value: number})];',
		outdent`
			function format(first = 0, second = first) { return second; }
			[
				(format as (first: number, second: number | undefined) => number)(1, undefined),
				(format as (first: number, second: number | undefined) => number)(2, undefined),
			];
		`,
	]) {
		const result = linter.verifyAndFix(code, typescriptConfig);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		const javascript = stripTypeScriptTypes(result.output);
		const originalJavascript = stripTypeScriptTypes(code);
		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(javascript)), JSON.stringify(vm.runInNewContext(originalJavascript)));
	}
});

test('requires manual fixes for TypeScript filenames without parser services', t => {
	const code = 'function format(value) { return value; } [format(1), format(1)];';
	for (const extension of ['ts', 'mts', 'cts', 'tsx', 'js']) {
		const result = linter.verifyAndFix(code, {...config, files: ['**/*.{js,ts,mts,cts,tsx}']}, {filename: `input.${extension}`});
		if (extension === 'js') {
			t.assert.strictEqual(result.fixed, true);
			t.assert.deepStrictEqual(result.messages, []);
		} else {
			t.assert.strictEqual(result.fixed, false);
			t.assert.strictEqual(result.output, code);
			t.assert.strictEqual(result.messages.length, 1);
			t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-unnecessary-parameters');
		}

		t.assert.strictEqual(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
	}
});

test('preserves arrow parameter parentheses and trailing commas', async t => {
	const results = [];
	for (const parameter of ['value', '(value)', '(value,)', '(value = 1,)', 'async value', 'async (value,)', 'async (value = 1,)']) {
		const code = `const format = ${parameter} => value; [format(1,), format(1,)];`;
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, true);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(result.output, `const format = ${parameter.startsWith('async') ? 'async ' : ''}() => 1; [format(), format()];`);
		results.push(Promise.all(vm.runInNewContext(result.output)));
	}

	for (const values of await Promise.all(results)) {
		t.assert.strictEqual(JSON.stringify(values), '[1,1]');
	}
});
