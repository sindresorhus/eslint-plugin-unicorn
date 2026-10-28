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
		'function run<T>(value: T = true as T) {} run(true);',
		'function run<T>(value: T | boolean = true) {} run(true);',
		'function run<T>(value = true as T) {} run(true);',
		'function run<T>(value: T = true as T) {} run<boolean>(true);',
		'function make<T>(value: T = 0 as T): T { return value; } make(0).toFixed();',
		'function run<T, U>(value: U = true as U) {} run(true);',
		'function run<T>({value = true}: {value?: T | boolean}) {} run({value: true});',
		'function run<T>({value = true as T}) {} run({value: true});',
		'type Options<T> = {value?: boolean}; function run<T>({value = true}: Options<T>) {} run({value: true});',
		'interface Options<T> {value?: boolean} function run<T>({value = true}: Options<T>) {} run({value: true});',
		'function run<T>({value = true}: {[key: string]: T | boolean | undefined; value?: boolean}) {} run({value: true});',
		'function run<T>({value = true} = {} as {value?: T | boolean}) {} run({value: true});',
		'function run<T>(value = true as typeof other, other?: T): T | undefined { return value; } run(true);',
		'function run<T>(items: T[], value: typeof items[0] = true as typeof items[0]): T { return value; } run([], true);',
		'function run<T>({value = true}: {value?: typeof other | boolean}, other?: T) {} run({value: true});',
		'function run<T>({value = true as typeof other}, other?: T) {} run({value: true});',
		'function run<T>({value = true} = {} as {value?: typeof other}, other?: T) {} run({value: true});',
		'const run: <T>(value?: T) => T = <U>(value: any = true) => value; run(true);',
		'const run = (<U>(value: any = true) => value) as <T>(value?: T) => T; run(true);',
		'const run = (<U>(value: any = true) => value) satisfies <T>(value?: T) => T; run(true);',
		'function run<U>(value: any = true) { return value; } (run as <T>(value?: T) => T)(true);',
		'function run<U>(value: any = true) { return value; } (<(<T>(value?: T) => T)>run)(true);',
		'function run<U>(value: any = true) { return value; } (run as <T>(value?: T) => T)!(true);',
		'function run<U>({value = true}: any) { return value; } (run as <T>(options: {value?: T}) => T)({value: true});',
		'function run(value = true as boolean) {} (run as Function)(true as boolean);',
		'function run<T extends {value?: boolean}>(seed: T, {value = true} = seed): T { return seed; } run({}, {value: true});',
		'function run<T>({value = true} = {}) {} run({value: true});',
		'function run<T>({value = true}: {value?: boolean} = {}) {} run({value: true});',
		'declare function run(value?: boolean): void; run(true);',
		'function run(value: boolean): void; function run(value = true) {} run(true);',
		'function run(value = true) {} const value = false as true; run(value);',
	],
	invalid: [
		'function run(value: boolean = true) {} run(true);',
		'function run(this: void, value = true) {} run(true);',
		'const run: (value: boolean) => void = (value = true) => {}; run(true);',
		'const run = ((value = true) => {}) satisfies Function; run(true);',
		'function run(value = true as boolean) {} run(true as boolean);',
		'function run(value = true) {} run!(true!);',
		'function run(value = +1) {} run((+1) as number);',
		'function run({value = true}: {value: boolean}) {} run({value: true});',
		'function run({value = true}: {value?: boolean}) {} run(({value: true}) as {value: boolean});',
		'function run({value = true}: {value: boolean}) {} run({value: /* keep */ true});',
		'function run({value = true}: {value: boolean}, ...rest: unknown[]) {} run({value: true}, ...other);',
		'function run<T>(value = true) {} run(true);',
		'function run<T>(T = true) {} run(true);',
		'const run = <T>(value = true) => {}; run(true);',
		'const run = function <T>(value = true) {}; run(true);',
		'function run<T>(value: T = true as T, count = 1) {} run(true, 1);',
		'function run<T>(first = true, value: T = true as T, count = 1) {} run(true, true, 1);',
		'function run<T>({value = true as T, dense = false}: {value?: T; dense?: boolean}) {} run({value: true, dense: false});',
		'function run<T>({value: renamed = true}: {value?: boolean; other?: T}) {} run({value: true});',
		'function run<T>({value = true}) {} run({value: true});',
		'function run<T>({value = true, dense = false}: {value?: T | boolean; dense?: boolean}) {} run({value: true, dense: false});',
		'function run<T>(value = true as typeof other, count = 1, other?: T) {} run(true, 1);',
		'function run<T>(value = true as boolean, count = 1) {} run(true as boolean, 1);',
		'function run<T>({"count": count = 1, selected = false as T}: {"count"?: number; selected?: T}) {} run({count: 1, selected: false});',
		'function run<T>({0x1: count = 1, selected = false as T}: {0x1?: number; selected?: T}) {} run({1: 1, selected: false});',
		'const run = ((<T>(value = true) => {})); run(true);',
		'function run<T>(value = true) {} (run<boolean>)(true);',
		'function run<T>(value = true) {} (run satisfies Function)(true);',
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

testRule({
	valid: [],
	invalid: [
		{
			code: 'function run<T>({flag: outerFlag = true} = {}, {flag = false}: {flag?: boolean}, count = 1) {} run({flag: true}, {flag: false}, 1);',
			languageOptions: {parser: parsers.typescript},
			errors: [
				{
					messageId: 'property',
					data: {name: 'flag'},
					suggestions: [{
						messageId: 'remove-property',
						output: 'function run<T>({flag: outerFlag = true} = {}, {flag = false}: {flag?: boolean}, count = 1) {} run({flag: true}, { }, 1);',
					}],
				},
				{
					messageId: 'arguments',
					suggestions: [{
						messageId: 'remove-arguments',
						output: 'function run<T>({flag: outerFlag = true} = {}, {flag = false}: {flag?: boolean}, count = 1) {} run({flag: true}, {flag: false});',
					}],
				},
			],
		},
		{
			...typeAware(
				'import {run} from "./no-unnecessary-default-arguments.callee.js"; run({flag: true}, {flag: false}, 1);',
				'export function run<T>({flag: outerFlag = true} = {}, {flag = false}: {flag?: boolean}, count = 1) {}',
			),
			errors: [
				{
					messageId: 'property',
					data: {name: 'flag'},
					suggestions: [{
						messageId: 'remove-property',
						output: 'import {run} from "./no-unnecessary-default-arguments.callee.js"; run({flag: true}, { }, 1);',
					}],
				},
				{
					messageId: 'arguments',
					suggestions: [{
						messageId: 'remove-arguments',
						output: 'import {run} from "./no-unnecessary-default-arguments.callee.js"; run({flag: true}, {flag: false});',
					}],
				},
			],
		},
		{
			...typeAware(
				'import {run} from "./no-unnecessary-default-arguments.callee.js"; run<number>({value: false, dense: false}); run({value: true, dense: false});',
				'type Options<T> = {value?: T | boolean; dense?: boolean}; export function run<T>({value = true, dense = false}: Options<T>) {}',
			),
			errors: [
				{
					messageId: 'property',
					data: {name: 'dense'},
					suggestions: [{
						messageId: 'remove-property',
						output: 'import {run} from "./no-unnecessary-default-arguments.callee.js"; run<number>({value: false  }); run({value: true, dense: false});',
					}],
				},
				{
					messageId: 'property',
					data: {name: 'dense'},
					suggestions: [{
						messageId: 'remove-property',
						output: 'import {run} from "./no-unnecessary-default-arguments.callee.js"; run<number>({value: false, dense: false}); run({value: true  });',
					}],
				},
			],
		},
		{
			...typeAware([
				'interface Base<Value> {value?: Value | boolean}',
				'interface Options<Child> extends Base<Child> {dense?: boolean}',
				'function run<Entry>({value: selected = true, dense = false}: Options<Entry>) {}',
				'run({value: true, dense: false});',
			].join('\n')),
			errors: [{
				messageId: 'property',
				data: {name: 'dense'},
				suggestions: [{
					messageId: 'remove-property',
					output: [
						'interface Base<Value> {value?: Value | boolean}',
						'interface Options<Child> extends Base<Child> {dense?: boolean}',
						'function run<Entry>({value: selected = true, dense = false}: Options<Entry>) {}',
						'run({value: true  });',
					].join('\n'),
				}],
			}],
		},
		{
			...typeAware(
				'import {run} from "./no-unnecessary-default-arguments.callee.js"; run({value: true, dense: false});',
				[
					'interface Base<Value> {value?: Value | boolean}',
					'interface Options<Child> extends Base<Child> {dense?: boolean}',
					'export function run<Entry>({value: selected = true, dense = false}: Options<Entry>) {}',
				].join('\n'),
			),
			errors: [{
				messageId: 'property',
				data: {name: 'dense'},
				suggestions: [{
					messageId: 'remove-property',
					output: 'import {run} from "./no-unnecessary-default-arguments.callee.js"; run({value: true  });',
				}],
			}],
		},
	],
});

testRule({
	valid: [],
	invalid: [
		{
			code: 'function pick<T>(items: T[], count = 1): T[] { return items; } pick([1], 1);',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'arguments', suggestions: [{messageId: 'remove-arguments', output: 'function pick<T>(items: T[], count = 1): T[] { return items; } pick([1]);'}]}],
		},
		{
			code: 'function list<T>({items, dense = false}: {items: T[]; dense?: boolean}) {} list({items: [1], dense: false});',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'property',
				data: {name: 'dense'},
				suggestions: [{
					messageId: 'remove-property',
					output: 'function list<T>({items, dense = false}: {items: T[]; dense?: boolean}) {} list({items: [1]  });',
				}],
			}],
		},
	],
});

testRule.snapshot({
	valid: [
		'import {run} from "./missing.js"; run(true);',
		typeAware(importedCall, 'export const run = other;'),
		typeAware(importedCall, 'export let run = (value = true) => {};'),
		typeAware(importedCall, 'export const run = wrap((value = true) => {});'),
		typeAware(importedCall, 'export function run<T>(value: T = true as T) {}'),
		typeAware(importedCall, 'export function run<T>(value: T | boolean = true) {}'),
		typeAware(importedCall, 'export function run<T>(value = true as T) {}'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run<boolean>(true);', 'export function run<T>(value: T = true as T) {}'),
		typeAware(
			'import {run} from "./no-unnecessary-default-arguments.callee.js"; run({value: true});',
			'type Options<T> = {value?: T | boolean}; export function run<T>({value = true}: Options<T>) {}',
		),
		typeAware(
			'import {run} from "./no-unnecessary-default-arguments.callee.js"; run({value: true});',
			'interface Options<T> {value?: T | boolean} export function run<T>({value = true}: Options<T>) {}',
		),
		...[
			'function run<T extends {value?: boolean}>({value = true}: T) {}',
			'function run<T>({value = true}: T & {value?: boolean}) {}',
			'type Options<T> = T & {value?: boolean}; function run<T>({value = true}: Options<T>) {}',
			'type Options<T> = {[key: string]: T} & {value?: boolean}; function run<T>({value = true}: Options<T>) {}',
			'interface Options<T> {[key: string]: T | boolean | undefined; value?: boolean} function run<T>({value = true}: Options<T>) {}',
			'type Options<T> = {[Key in keyof T]?: boolean}; function run<T extends {value?: unknown}>({value = true}: Options<T>) {}',
			'function run<T>({value = true} = {} as {value?: T | boolean}) {}',
			'function run<T>({value = true} = {}) {}',
			'function run<T>({value = true}: {value?: boolean} = {}) {}',
			'function run<T>({value = true}: {value?: typeof other | boolean}, other?: T) {}',
			'function run<T>({value = true as typeof other}, other?: T) {}',
			'function run<T>({value = true} = {} as {value?: typeof other}, other?: T) {}',
		].flatMap(declaration => [
			typeAware(`${declaration} run({value: true});`),
			typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run({value: true});', `${declaration} export {run};`),
		]),
		...[
			'function run<T>(value = true as typeof other, other?: T) {}',
			'const run: <T>(value?: T) => T = <U>(value: any = true) => value;',
			'type Callable = <T>(value?: T) => T; const run: Callable = <U>(value: any = true) => value;',
			'const run = (<U>(value: any = true) => value) as <T>(value?: T) => T;',
		].flatMap(declaration => [
			typeAware(`${declaration} run(true);`),
			typeAware(importedCall, `${declaration} export {run};`),
		]),
		typeAware(defaultImportedCall, 'export default (<U>(value: any = true) => value) as <T>(value?: T) => T;'),
		...[
			'type Options<T> = T extends unknown ? T & {value?: boolean} : never;',
			'type Options<T> = T extends unknown ? {[Key in keyof T]?: boolean} : never;',
		].flatMap(declaration => [
			typeAware(`${declaration} function run<T extends {value?: unknown}>({value = true}: Options<T>) {} run({value: true});`),
			typeAware(
				'import {run} from "./no-unnecessary-default-arguments.callee.js"; run({value: true});',
				`${declaration} export function run<T extends {value?: unknown}>({value = true}: Options<T>) {}`,
			),
		]),
		typeAware(
			'import {run} from "./no-unnecessary-default-arguments.callee.js"; (run as <T>(value?: T) => T)(true);',
			'export function run<U>(value: any = true) { return value; }',
		),
		typeAware(
			'import {run} from "./no-unnecessary-default-arguments.callee.js"; (run as <T>(options: {value?: T}) => T)({value: true});',
			'export function run<U>({value = true}: any) { return value; }',
		),
		typeAware('function run<T extends {value?: boolean}>(seed: T, {value = true} = seed): T { return seed; } run({}, {value: true});'),
		typeAware(
			'import {run} from "./no-unnecessary-default-arguments.callee.js"; run({}, {value: true});',
			'export function run<T extends {value?: boolean}>(seed: T, {value = true} = seed): T { return seed; }',
		),
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
		typeAware(importedCall, 'export function run<T>(value = true) {}'),
		typeAware(importedCall, 'export const run = <T>(value = true) => {};'),
		typeAware(importedCall, 'export const run = function <T>(value = true) {};'),
		typeAware(defaultImportedCall, 'export default <T>(value = true) => {};'),
		typeAware('import {run} from "./no-unnecessary-default-arguments.callee.js"; run(true, 1);', 'export function run<T>(value: T = true as T, count = 1) {}'),
		typeAware(
			'import {run} from "./no-unnecessary-default-arguments.callee.js"; run({value: true, dense: false});',
			'export function run<T>({value = true as T, dense = false}: {value?: T; dense?: boolean}) {}',
		),
		...[
			'type Options<T> = {value?: T | boolean; dense?: boolean};',
			'interface Options<T> {value?: T | boolean; dense?: boolean}',
		].flatMap(declaration => [
			typeAware(`${declaration} function run<T>({value = true, dense = false}: Options<T>) {} run({value: true, dense: false});`),
			typeAware(
				'import {run} from "./no-unnecessary-default-arguments.callee.js"; run({value: true, dense: false});',
				`${declaration} export function run<T>({value = true, dense = false}: Options<T>) {}`,
			),
		]),
		typeAware(defaultImportedCall, 'export default ((<T>(value = true) => {}));'),
		typeAware(
			'type Options<T extends boolean> = {value?: T | boolean; dense?: boolean}; function run<T extends boolean>({value = true, dense = false}: Options<T>) {} run({value: true, dense: false});',
		),
		typeAware(
			'import {run} from "./no-unnecessary-default-arguments.callee.js"; run({value: true, dense: false});',
			'type Options<T extends boolean> = {value?: T | boolean; dense?: boolean}; export function run<T extends boolean>({value = true, dense = false}: Options<T>) {}',
		),
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
	t.assert.strictEqual(messages[0].suggestions.length, 1);
});

test('commented matching properties do not prevent safe sibling removals', t => {
	const code = 'function run({one = true, two = true, three = true}) {} run({one: /* keep */ true, two: true, three: true});';
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.output, 'function run({one = true, two = true, three = true}) {} run({one: /* keep */ true    });');
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].messageId, 'property');
	t.assert.strictEqual(result.messages[0].fix, undefined);
});

testRule({
	valid: [],
	invalid: [{
		...typeAware(defaultImportedCall, 'export default (value = true) => value;'),
		errors: [{
			messageId: 'arguments',
			suggestions: [{
				messageId: 'remove-arguments',
				output: 'import run from "./no-unnecessary-default-arguments.callee.js"; run();',
			}],
		}],
	}],
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
