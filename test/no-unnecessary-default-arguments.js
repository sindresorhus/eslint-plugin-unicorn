/* eslint-disable no-template-curly-in-string */
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import {Linter} from 'eslint';
import ts from 'typescript';
import plugin from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: testRule} = getTester(import.meta);

testRule({
	valid: [
		{
			code: '"use strict"; function run(value = true) {} run(true);',
			languageOptions: {sourceType: 'script'},
		},
		'function run(value = true) {} run(true); eval(source);',
	],
	invalid: [
		{
			code: 'function run(flag = true) {} run(true);',
			output: 'function run(flag = true) {} run();',
			errors: [{messageId: 'arguments'}],
		},
		{
			code: 'function run(value = true) {\r\n  return value;\r\n}\r\nrun(\r\n  true,\r\n);',
			output: 'function run(value = true) {\r\n  return value;\r\n}\r\nrun(\r\n  \r\n);',
			errors: [{messageId: 'arguments'}],
		},
		{
			code: 'const run = (value = true) => value; globalThis.run = value => value; run(true);',
			output: 'const run = (value = true) => value; globalThis.run = value => value; run();',
			languageOptions: {sourceType: 'script'},
			errors: [{messageId: 'arguments'}],
		},
		{
			code: '(function () { function run(value = true) {} run(true); })();',
			output: '(function () { function run(value = true) {} run(); })();',
			languageOptions: {sourceType: 'script'},
			errors: [{messageId: 'arguments'}],
		},
		{
			code: 'function run(value = true) {} run(true);',
			output: 'function run(value = true) {} run();',
			languageOptions: {sourceType: 'commonjs'},
			errors: [{messageId: 'arguments'}],
		},
	],
});

testRule.snapshot({
	valid: [
		'function run(flag = true) {} run();',
		'function run(flag = true) {} run(false);',
		'function run(flag) {} run(true);',
		'function run(flag = true) {} run(true, false);',
		'function run(flag = true, next = false) {} run(true, true);',
		'function run(flag = true) {} run(undefined);',
		'function run(flag = undefined) {} run(undefined);',
		'function run(flag = void 0) {} run(void 0);',
		'function run(flag = enabled) {} run(enabled);',
		'function run(flag = true) {} const enabled = true; run(enabled);',
		'function run(value = 1 + 1) {} run(2);',
		'function run(value = /x/) {} run(/x/);',
		'function run(value = {}) {} run({});',
		'function run(value = []) {} run([]);',
		'function run(value = `x${1}`) {} run("x1");',
		'function run(value = 0) {} run(-0);',
		'function run(value = -0) {} run(0);',
		'function run(value = 1n) {} run(1);',
		'function run(value = true) {} run(...values, true);',
		'function run(value = true) {} run(true, ...values);',
		'function run(value = true) {} new run(true);',
		'const object = {run(value = true) {}}; object.run(true);',
		'const run = wrap((value = true) => {}); run(true);',
		'const run = (value = true) => {}; const alias = run; alias(true);',
		'let run = (value = true) => {}; run(true);',
		'var run = (value = true) => {}; run(true);',
		'function run(value = true) {} run(true); run = other;',
		'function run(value = true) { return arguments.length; } run(true);',
		'function run(value = true, next = arguments[0]) {} run(true);',
		'function run(value = true, next = (() => arguments.length)()) {} run(true);',
		'function run(value = true) { return (() => arguments.length)(); } run(true);',
		'function outer() { const run = (value = true) => arguments.length; run(true); }',
		'function run({value = true}) {} run({value: false});',
		'function run({value = true}) {} run({value: true, ...other});',
		'function run({value = true}) {} run({...other, value: true});',
		'function run({value = true}) {} run({value: false, value: true});',
		'function run({value = true}) {} run({[key]: false, value: true});',
		'function run({value = true}) {} run({["value"]: true});',
		'function run({value = true}) {} run({get other() {}, value: true});',
		'function run({value = true}) {} run({other() {}, value: true});',
		'function run({value = true}) {} run({__proto__: other, value: true});',
		'function run({[key]: value = true}) {} run({value: true});',
		'function run({value: first = true, value: second = false}) {} run({value: true});',
		'function run({value: {nested = true}}) {} run({value: true});',
		'function run({toString = "default"}) {} run({toString: "default"});',
		'function run({constructor = true}) {} run({constructor: true});',
		'function run({__proto__: value = true}) {} run({"__proto__": true});',
		'function run({value = true}) {} run(options);',
		'function run(first, {value = true}) {} run(...other, {value: true});',
		'function run(first, second, {value = true}) {} run(1, ...other, {value: true});',
		'function run({value = true}, last = false) {} run({value: false}, ...other, false);',
		'function run(value = true) {} eval("run = other"); run(true);',
		{code: 'function run(value = true) {} with (object) { run(true); }', languageOptions: {sourceType: 'script'}},
		{code: 'if (enabled) { function run(value = true) {} run(true); }', languageOptions: {sourceType: 'script'}},
		{code: 'function Badge({color = "gray"}) {} const element = <Badge color="gray" />;', languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
	],
	invalid: [
		'function run(flag = true) {} run(false); run(true);',
		'export function run(flag = true) {} run(true);',
		'const run = (flag = true) => {}; run(true);',
		'const run = function (flag = true) {}; run(true);',
		'run(true); function run(flag = true) {}',
		'function run(first = true, second = false) {} run(true, false);',
		'function run(first, second = true, third = false) {} run(value, true, false);',
		'function run(first = true, second = false) {} run(false, false);',
		'function run(value = true, ...rest) {} run(true);',
		'function run(value = true) {} (run)?.((true));',
		'function run(value = true) {} run((true),);',
		'function run(first = true, second = false) {} run((true), (false),);',
		'function run(first, second = true, third = false) {} run(value, true, false,);',
		'function run(value = true) {} run(/* keep */ true);',
		'function run(value = true) {} run(true /* keep */,);',
		'function run(value = true) {} run((/* keep */ true));',
		'function run(first = true, second = false) {} run(true, /* keep */ false);',
		'function run(first, second = true) {} run(value /* keep */, true);',
		'function run(value = "px") {} run(`px`);',
		'function run(value = `px`) {} run("px");',
		String.raw`function run(value = "\u0070x") {} run("px");`,
		'function run(value = "") {} run("");',
		'function run(value = false) {} run(false);',
		'function run(value = null) {} run(null);',
		'function run(value = 0) {} run(+0);',
		'function run(value = -0) {} run(-0);',
		'function run(value = 0x10) {} run(16);',
		'function run(value = -2) {} run(-2);',
		'function run(value = +2) {} run(2);',
		'function run(value = 1_000n) {} run(1000n);',
		'function run(value = -1n) {} run(-1n);',
		'function run({value = true}) {} run({value: true});',
		'function run({value: renamed = true}) {} run({value: true});',
		'function run({"value": renamed = true}) {} run({"value": true});',
		'function run({1: value = true}) {} run({1: true});',
		'function run({value = true, ...rest}) {} run({value: true, other: 1});',
		'function run(first, {unit = "px", digits = 0} = {}, last) {} run(width, {unit: "px", digits: 2}, last);',
		'function run({value = true} = {value: false}) {} run({value: true});',
		'function run({first = true, second = false}) {} run({first: true, second: false});',
		'function run({value = true}) {} run({value: true,});',
		'function run({value = true}) {} run(({value: true}));',
		'function run({value = true}) {} run({value: /* keep */ true});',
		'function run({value = true}) {} run({/* keep */ value: true});',
		'function run({value = true}) {} run({value: true /* keep */, other: 1});',
		'function run(value = true) { function other() { return arguments.length; } } run(true);',
		'function run(value = true, next = (function () { return arguments.length; })()) {} run(true);',
		'/** A descriptive comment. */ function run(value = true) {} run(true);',
		'// @ts-check\nfunction run(value = true) {} run(true);',
		'/** @param {boolean} value */ function run(value = true) {} run(true);',
		'function run({value = true}, ...rest) {} run({value: true}, ...other);',
		'function run({value = true}, next, {value: last = false}) {} run({value: true}, ...other, {value: false});',
		'function run({value = true}, last = false) {} run({value: true}, ...other, false);',
		'function run({value = true}, ...rest) {} run({value: /* keep */ true}, ...other);',
	],
});

testRule.snapshot({
	testerOptions: {languageOptions: {parser: parsers.typescript}},
	valid: [
		'function run<T>(value = true) {} run(true);',
		'declare function run(value?: boolean): void; run(true);',
		'function run(value: boolean): void; function run(value = true) {} run(true);',
		'function run(value = true) {} const value = false as true; run(value);',
	],
	invalid: [
		'function run(value: boolean = true) {} run(true);',
		'function run(this: void, value = true) {} run(true);',
		'const run: (value: boolean) => void = (value = true) => {}; run(true);',
		'const run = ((value = true) => {}) satisfies Function; run(true);',
		'function run(value = true as boolean) {} (run as Function)(true as boolean);',
		'function run(value = true) {} run!(true!);',
		'function run(value = +1) {} run((+1) as number);',
		'function run({value = true}: {value: boolean}) {} run({value: true});',
		'function run({value = true}: {value?: boolean}) {} run(({value: true}) as {value: boolean});',
		'function run({value = true}: {value: boolean}) {} run({value: /* keep */ true});',
		'function run({value = true}: {value: boolean}, ...rest: unknown[]) {} run({value: true}, ...other);',
	],
});

function typeAware(code, declarations = 'export function run(value = true) {}', extension = 'ts') {
	const filename = path.join(import.meta.dirname, `no-unnecessary-default-arguments.input.${extension}`).replaceAll('\\', '/');
	const sources = new Map([
		[filename, code],
		[path.join(import.meta.dirname, `no-unnecessary-default-arguments.callee.${extension}`), declarations],
		[path.join(import.meta.dirname, `no-unnecessary-default-arguments.reexport.${extension}`), 'export {run} from "./no-unnecessary-default-arguments.callee.js";'],
		[path.join(import.meta.dirname, `no-unnecessary-default-arguments.star.${extension}`), 'export * from "./no-unnecessary-default-arguments.callee.js";'],
		[path.join(import.meta.dirname, 'no-unnecessary-default-arguments.declaration.d.ts'), 'export declare function run(value?: boolean): void;'],
	].map(([filename, source]) => [filename.replaceAll('\\', '/'), source]));
	const options = {
		allowJs: true, noLib: true, types: [], strict: true, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
	};
	const host = ts.createCompilerHost(options);
	const readFile = host.readFile.bind(host);
	const fileExists = host.fileExists.bind(host);
	host.readFile = filename => sources.get(filename) ?? readFile(filename);
	host.fileExists = filename => sources.has(filename) || fileExists(filename);
	const program = ts.createProgram([filename], options, host);
	return {
		code,
		filename,
		languageOptions: {
			parser: parsers.typescript.implementation,
			parserOptions: {programs: [program]},
		},
	};
}

const importedCall = 'import {run} from "./no-unnecessary-default-arguments.callee.js"; run(true);';
const defaultImportedCall = 'import run from "./no-unnecessary-default-arguments.callee.js"; run(true);';
const contextualImplementation = 'function target(value = true) {} export const run: typeof target = (value = false) => {};';

testRule.snapshot({
	valid: [
		'import {run} from "./missing.js"; run(true);',
		typeAware(importedCall, 'export const run = other;'),
		typeAware(importedCall, 'export let run = (value = true) => {};'),
		typeAware(importedCall, 'export const run = wrap((value = true) => {});'),
		typeAware(importedCall, 'export function run<T>(value = true) {}'),
		typeAware(importedCall, 'export function run(value: boolean): void; export function run(value = true) {}'),
		typeAware(importedCall, 'export function run(value = true) { return arguments.length; }'),
		typeAware(importedCall, 'export function run(value = true, next = arguments[0]) {}'),
		typeAware(importedCall, 'export function run(value = true, next = (() => arguments.length)()) {}'),
		typeAware(importedCall, 'export function run(value = true) { return (() => arguments.length)(); }'),
		typeAware(importedCall, 'export function run(value = true) { eval("arguments.length"); }'),
		typeAware(importedCall, 'function target(value = true) {} function other(value = false) {} export const run: typeof target = other;'),
		typeAware(importedCall, 'function target(value = true) {} export const run: typeof target = wrap(target);'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.declaration.js"; run(true);'),
		typeAware('import {run} from "./missing.js"; run(true);'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; const alias = run; alias(true);'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run(false);'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run({...other, value: true});', 'export function run({value = true}) {}'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run({value: true});', 'export function run({["value"]: value = true}) {}'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run({value: true});', 'export function run({value: first = true, value: second = false}) {}'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run({1: true});', 'export function run({1: first = true, 0x1: second = false}) {}'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run({constructor: true});', 'export function run({constructor = true}) {}'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run({"__proto__": true});', 'export function run({__proto__: value = true}) {}'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run(0);', 'export function run(value = -0) {}'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; function outer(run: (value: boolean) => void) { run(true); }'),
		typeAware(importedCall, contextualImplementation),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; const value = false as true; run(value);'),
	],
	invalid: [
		typeAware(importedCall),
		typeAware(importedCall, 'export const run = (value = true) => {};'),
		typeAware(importedCall, 'export const run = function (value = true) {};'),
		typeAware(importedCall, 'export const run: (value: boolean) => void = (value = true) => {};'),
		typeAware(importedCall, 'export const run = ((value = true) => {}) satisfies Function;'),
		typeAware(importedCall, 'export function run(this: void, value = true) {}'),
		typeAware('import run from "./no-unnecessary-default-arguments.callee.js"; run(true);', 'export default function run(value = true) {}'),
		typeAware('import run from "./no-unnecessary-default-arguments.callee.js"; run(true);', 'const run = (value = true) => {}; export default run;'),
		typeAware('import {run as execute} from "./no-unnecessary-default-arguments.callee.js"; execute(true);'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.reexport.js"; run(true);'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run("px", -0, -1_000n);', 'export function run(unit = `px`, zero = -0, count = -1000n) {}'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run(null, false, 16);', 'export function run(value = null, flag = false, count = 0x10) {}'),
		typeAware(String.raw`import {run} from "./no-unnecessary-default-arguments.callee.js"; run("px", "line\n", 2);`, 'export function run(unit = "\\u0070x", text = `line\\n`, count = +2) {}'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run({1: true});', 'export function run({0x1: value = true}) {}'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run({value: true});', 'export function run({value = true}: {value: boolean}) {}'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run({unit: "px", other: 2});', 'export function run({unit: renamed = "px", ...rest} = {unit: "other"}) {}'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run(true /* keep */);'),
		typeAware('import run from "./no-unnecessary-default-arguments.callee.js"; run(true);', 'export default function (value = true) {}'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run(false);', contextualImplementation),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run?.(false, true);', 'export function run(first = true, next = true) {}'),
		typeAware(importedCall, 'export function run(value = true) {}', 'js'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run({value: true});', '/** @param {{value: boolean}} options */ export function run({value = true}) {}', 'js'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.star.js"; run(false); run(true); run(false);'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run({value: true}, ...other);', 'export function run({value = true}: {value: boolean}, ...rest: unknown[]) {}'),
	],
});

testRule.snapshot({
	valid: [],
	invalid: [parsers.vue, parsers.svelte].flatMap(parser => [
		{
			code: '<script>function run(value = true) {} run(true);</script>',
			languageOptions: {parser},
		},
		{
			code: '<script lang="ts">function run(value: boolean = true) {} run(true);</script>',
			languageOptions: {parser, parserOptions: {parser: parsers.typescript.implementation}},
		},
	]),
});

const linter = new Linter();
const config = {
	plugins: {unicorn: plugin},
	rules: {'unicorn/no-unnecessary-default-arguments': 'error'},
};

test('typed autofixes preserve strict type checking', t => {
	const cases = [
		[
			'function run(value = true) {} run(true);',
			'function run(value = true) {} run();',
		],
		[
			'function run(first = true, second = false) {} run(true, false);',
			'function run(first = true, second = false) {} run();',
		],
		[
			'function run(this: void, value = true) {} run?.(true);',
			'function run(this: void, value = true) {} run?.();',
		],
		[
			'function run(value = true) {} (run as (value?: boolean) => void)(true as boolean);',
			'function run(value = true) {} (run as (value?: boolean) => void)();',
		],
		[
			'function run(value = true) {} run!(true!);',
			'function run(value = true) {} run!();',
		],
		[
			'function run({unit = "px"}: {unit?: string}) {} run({unit: "px"});',
			'function run({unit = "px"}: {unit?: string}) {} run({ });',
		],
		[
			'function run({unit = "px"}) {} run({unit: "px"});',
			'function run({unit = "px"}) {} run({ });',
		],
		[
			'function run({unit = "px"}: {unit?: string} | undefined = {}) {} run({unit: "px"});',
			'function run({unit = "px"}: {unit?: string} | undefined = {}) {} run({ });',
		],
		[
			'function run({unit = "px", kind}: {unit?: string; kind: "a"} | {unit?: string; kind: "b"}) {} run({unit: "px", kind: "b"});',
			'function run({unit = "px", kind}: {unit?: string; kind: "a"} | {unit?: string; kind: "b"}) {} run({  kind: "b"});',
		],
		[
			'function run({unit = "px"}: {unit?: string}) {} run(({unit: "px"}) satisfies {unit?: string});',
			'function run({unit = "px"}: {unit?: string}) {} run(({ }) satisfies {unit?: string});',
		],
		[
			'import {run} from "./no-unnecessary-default-arguments.callee.js"; run(true);',
			'import {run} from "./no-unnecessary-default-arguments.callee.js"; run();',
		],
		[
			'// @ts-check\nfunction run(value = true) {} run(true);',
			'// @ts-check\nfunction run(value = true) {} run();',
			undefined,
			'js',
		],
		[
			'import {run} from "./no-unnecessary-default-arguments.callee.js"; run({unit: "px"});',
			'import {run} from "./no-unnecessary-default-arguments.callee.js"; run({ });',
			'/** @param {{unit?: string}} options */ export function run({unit = "px"}) {}',
			'js',
		],
	];

	for (const [code, output, declarations, extension] of cases) {
		const fixture = typeAware(code, declarations, extension);
		const [program] = fixture.languageOptions.parserOptions.programs;
		t.assert.deepStrictEqual(program.getSemanticDiagnostics(), [], code);
		const messages = linter.verify(code, {
			...config,
			files: ['**'],
			languageOptions: fixture.languageOptions,
		}, {filename: fixture.filename});
		t.assert.strictEqual(messages.length, 1);
		t.assert.notStrictEqual(messages[0].fix, undefined);
		const {range, text} = messages[0].fix;
		t.assert.strictEqual(code.slice(0, range[0]) + text + code.slice(range[1]), output);
		const fixedFixture = typeAware(output, declarations, extension);
		const [fixedProgram] = fixedFixture.languageOptions.parserOptions.programs;
		t.assert.deepStrictEqual(fixedProgram.getSemanticDiagnostics(), [], output);
		t.assert.deepStrictEqual(linter.verify(output, {
			...config,
			files: ['**'],
			languageOptions: fixedFixture.languageOptions,
		}, {filename: fixedFixture.filename}), []);
	}
});

test('uncertain typed removals retain suggestions', t => {
	const cases = [
		'const run: (value: boolean) => void = (value = true) => {}; run(true);',
		'const run: (first: boolean, second?: boolean) => void = (first = true, second = false) => {}; run(true, false);',
		'const run: <T>(value?: T) => T = (value = true as any) => value; run(true);',
		'const run: {(): false; (value: boolean): true} = (value = true): any => value; run(true);',
		'const run: <T>(options: {value?: T}) => T = ({value = true as any}) => value; const result = run({value: true});',
		'const run: {(options: {value?: false}): false; (options: {value?: boolean}): true} = ({value = true}): any => value; const result = run({value: true});',
		'function run(value = true) {} (run as (value: boolean) => void)(true);',
		'function run({unit = "px"}: {unit: string}) {} run({unit: "px"});',
		'function run({unit = "px", kind}: {unit?: string; kind: "a"} | {unit: string; kind: "b"}) {} run({unit: "px", kind: "b"});',
		'const run: (options: {unit?: string} | {other: boolean}) => void = ({unit = "px"}: any) => {}; run({unit: "px"});',
		'function run({unit = "px"}: {unit?: string} & {other?: boolean}) {} run({unit: "px"});',
		'function run({unit = "px"}: {unit?: string}) {} run(({unit: "px"}) satisfies {unit: string});',
	];

	for (const code of cases) {
		const fixture = typeAware(code);
		const [program] = fixture.languageOptions.parserOptions.programs;
		t.assert.deepStrictEqual(program.getSemanticDiagnostics(), [], code);
		const result = linter.verifyAndFix(code, {
			...config,
			files: ['**'],
			languageOptions: fixture.languageOptions,
		}, {filename: fixture.filename});
		t.assert.strictEqual(result.fixed, false, code);
		t.assert.strictEqual(result.messages.length, 1, code);
		t.assert.strictEqual(result.messages[0].suggestions.length, 1, code);
	}
});

test('loads checker-backed fixtures with Windows path separators', t => {
	const joinPath = path.join;
	const joinMock = t.mock.method(path, 'join', (...parts) => joinPath(...parts).replaceAll('/', '\\'));
	const fixture = typeAware(importedCall);
	joinMock.mock.restore();
	const [program] = fixture.languageOptions.parserOptions.programs;
	t.assert.strictEqual(program.getSourceFile(fixture.filename)?.text, importedCall);
	const messages = linter.verify(fixture.code, {
		...config,
		files: ['**'],
		languageOptions: fixture.languageOptions,
	}, {filename: fixture.filename});
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].messageId, 'arguments');
	t.assert.notStrictEqual(messages[0].fix, undefined);
});

test('commented matching properties do not prevent safe sibling removals', t => {
	const code = 'function run({one = true, two = true, three = true}) {} run({one: /* keep */ true, two: true, three: true});';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.output, 'function run({one = true, two = true, three = true}) {} run({one: /* keep */ true    });');
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].messageId, 'property');
	t.assert.strictEqual(result.messages[0].fix, undefined);
});

testRule.snapshot({
	valid: [],
	invalid: [typeAware(defaultImportedCall, 'export default (value = true) => value;')],
});

testRule.snapshot({
	valid: [
		typeAware(defaultImportedCall, 'export default wrap((value = true) => value);'),
		typeAware(defaultImportedCall, 'function target(value = true) {} function other(value = false) {} const run: typeof target = other; export default run;'),
		typeAware(defaultImportedCall, 'export default (function (value = true) { return arguments.length; });'),
		typeAware(defaultImportedCall, 'export = (value = true) => value;'),
	],
	invalid: [
		typeAware(defaultImportedCall, 'export default (function (value = true) { return value; });'),
		typeAware(defaultImportedCall, 'export default ((value = true) => value) satisfies (value: boolean) => boolean;'),
		typeAware('import run from "./no-unnecessary-default-arguments.callee.js"; run({value: true});', 'export default ({value = true}: {value: boolean}) => value;'),
		typeAware('function run({first = true, second = false}: {first?: boolean; second: boolean}) {} run({first: true, second: false});'),
		typeAware('function run({one = true, two = true}: {one?: boolean; two?: boolean}) {} run({one: /* keep */ true, two: true});'),
	],
});

test('autofixes preserve named function expression self-calls', t => {
	const code = 'const run = function inner(value = true) { if (!value) { return inner(true); } return value; }; run(false);';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.output, 'const run = function inner(value = true) { if (!value) { return inner(); } return value; }; run(false);');
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(vm.runInNewContext(result.output), vm.runInNewContext(code));
});

test('autofixes preserve values and rest arguments', t => {
	const code = 'function run(value = true, {unit = "px", ...rest} = {}, last = 0) { return [value, unit, rest, last]; } JSON.stringify(run(true, {unit: "px", other: 2}, 0));';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(vm.runInNewContext(result.output), vm.runInNewContext(code));
});

test('object arguments before spreads preserve values and rest arguments', t => {
	const code = 'function run(flag = true, {unit = "px", ...options}, ...rest) { return JSON.stringify([flag, unit, options, rest]); } run(true, {unit: "px", other: 1}, ...[2, 3]);';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.output, 'function run(flag = true, {unit = "px", ...options}, ...rest) { return JSON.stringify([flag, unit, options, rest]); } run(true, {  other: 1}, ...[2, 3]);');
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(vm.runInNewContext(result.output), vm.runInNewContext(code));
});

test('overlapping rules converge without changing the result', t => {
	const code = 'function run(value = true) { return value; } run(true); run(undefined); run();';
	const result = linter.verifyAndFix(code, {
		...config, rules: {
			...config.rules,
			'unicorn/no-unnecessary-parameters': 'error',
			'unicorn/no-useless-undefined': 'error',
		},
	});
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(vm.runInNewContext(result.output), vm.runInNewContext(code));
	t.assert.strictEqual(linter.verifyAndFix(result.output, config).fixed, false);
});

test('autofixes preserve later parameter defaults', t => {
	const code = 'function run(value = true, {unit = "px"} = {}, next = [value, unit]) { return next; } JSON.stringify([run(true), run(true, {unit: "px"})]);';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.output, 'function run(value = true, {unit = "px"} = {}, next = [value, unit]) { return next; } JSON.stringify([run(), run(true, { })]);');
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(vm.runInNewContext(result.output), vm.runInNewContext(code));
});

test('script function declarations stay unchanged after global object reassignment', t => {
	const code = 'function run(value = true) { return value; } globalThis.run = value => value; run(true);';
	const result = linter.verifyAndFix(code, {...config, languageOptions: {sourceType: 'script'}});
	t.assert.strictEqual(result.fixed, false);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(vm.runInNewContext(result.output), true);
});
