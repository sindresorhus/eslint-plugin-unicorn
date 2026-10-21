import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['Object.keys(new Map(/* keep */))', 'Array.from(new Map(/* keep */).keys())'],
		['Object.values((/* keep */ new Set()))', 'Array.from((/* keep */ new Set()).values())'],
		['Object.entries(new Map([["key", /* keep */ 1]]))', 'Array.from(new Map([["key", /* keep */ 1]]).entries())'],
		['Object.values(new Set(// keep\n))', 'Array.from(new Set(// keep\n).values())'],
		['Object.values(new Set(// keep\r\n))', 'Array.from(new Set(// keep\r\n).values())'],
	].map(([code, output]) => ({
		code,
		errors: [{
			messageId: 'no-object-methods-with-collections/error',
			suggestions: [{messageId: 'no-object-methods-with-collections/suggestion', output}],
		}],
	})),
});

test({
	valid: [],
	invalid: [
		{
			code: 'Object.values((value as /* keep */ Set<string>))',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'no-object-methods-with-collections/error',
				suggestions: [{messageId: 'no-object-methods-with-collections/suggestion', output: 'Array.from((value as /* keep */ Set<string>).values())'}],
			}],
		},
		...[
			'Object./* keep */keys(new Map())',
			'Object.keys(new Map() /* keep */)',
		].map(code => ({code, errors: [{messageId: 'no-object-methods-with-collections/error', suggestions: []}]})),
	],
});

nodeTest('collection suggestions preserve argument comments and evaluate the collection once', t => {
	const linter = new Linter();
	const code = 'let evaluations = 0; const result = Object.entries(new Map(/* keep */ (++evaluations, [["key", 1]]))); JSON.stringify([evaluations, result]);';
	const messages = linter.verify(code, {
		plugins: {unicorn: {rules: {'no-object-methods-with-collections': rule}}},
		rules: {'unicorn/no-object-methods-with-collections': 'error'},
	});

	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].fix, undefined);
	t.assert.strictEqual(messages[0].suggestions.length, 1);
	const {range, text} = messages[0].suggestions[0].fix;
	const output = code.slice(0, range[0]) + text + code.slice(range[1]);
	t.assert.ok(output.includes('/* keep */'));
	t.assert.strictEqual(runInNewContext(output), '[1,[["key",1]]]');
});

const typescript = code => ({
	code,
	languageOptions: {
		parser: parsers.typescript,
	},
});

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {
			projectService: {
				allowDefaultProject: ['*.ts'],
			},
		},
	},
});

test.snapshot({
	valid: [
		'Object.keys({a: 1})',
		'Object.values({a: 1})',
		'Object.entries({a: 1})',
		'Object.keys([1, 2])',
		'Object.values([1, 2])',
		'Object.entries([1, 2])',
		'Object.values(array)',
		'Object.entries(collection)',
		'Object.keys(new WeakMap())',
		'Object.values(new WeakMap())',
		'Object.entries(new WeakMap())',
		'Object.keys(new WeakSet())',
		'Object.values(new WeakSet())',
		'Object.entries(new WeakSet())',
		'Object?.keys(new Map())',
		'Object[method](new Map())',
		'Object["keys"](new Map())',
		'Object["values"](new Set())',
		'Object["entries"](new Map())',
		'Object.keys?.(new Map())',
		'globalThis.Object.keys(new Map())',
		'window.Object.values(new Set())',
		'const Object = {keys: value => value}; Object.keys(new Map())',
		'const Map = class {keys() { return []; }}; Object.keys(new Map())',
		'const Set = class {values() { return []; }}; Object.values(new Set())',
		'const map = getMap(); map.foo = 1; Object.keys(map);',
		typescript('function foo(map: WeakMap<object, string>) { return Object.keys(map); }'),
		typescript('function foo(set: WeakSet<object>) { return Object.values(set); }'),
		typescript('import {Map} from "immutable"; function foo(map: Map<string, number>) { return Object.keys(map); }'),
		typescript('interface Map<K, V> { keys(): K[] } function foo(map: Map<string, number>) { return Object.keys(map); }'),
		typescript('type Set<T> = {values(): T[]}; function foo(set: Set<string>) { return Object.values(set); }'),
		typescript('export interface Map<K, V> { keys(): K[] } function foo(map: Map<string, number>) { return Object.keys(map); }'),
		typescript('export type Set<T> = {values(): T[]}; function foo(set: Set<string>) { return Object.values(set); }'),
		typescript('function foo(collection: Map<string, number> | Set<string>) { return Object.entries(collection); }'),
		typeAware('export {}; class Map { keys() { return []; } } const map = new Map(); Object.keys(map);'),
		typeAware('interface Map<K, V> { keys(): K[] } declare const map: Map<string, number>; Object.keys(map);'),
		typeAware('export {}; interface Map<K, V> { keys(): K[] } declare const map: Map<string, number>; Object.keys(map);'),
		typeAware('export {}; type Map<K, V> = {keys(): K[]}; declare const map: Map<string, number>; Object.keys(map);'),
		typeAware('interface Collection { keys(): string[]; } declare const collection: Collection; Object.keys(collection);'),
		typeAware('declare const collection: Map<string, number> | Set<string>; Object.entries(collection);'),
		typeAware('declare const collection: unknown; Object.values(collection);'),
		typeAware('declare const collection: any; Object.entries(collection);'),
	],
	invalid: [
		'Object.keys(new Map())',
		'Object.values(new Map())',
		'Object.entries(new Map())',
		'Object.keys(new Set())',
		'Object.values(new Set())',
		'Object.entries(new Set())',
		'const map = new Map(); Object.keys(map);',
		'const set = new Set(); Object.values(set);',
		'Object.keys((new Map()))',
		'Object.values((new Set()))',
		typescript('function foo(map: Map<string, number>) { return Object.keys(map); }'),
		typescript('function foo(map: ReadonlyMap<string, number>) { return Object.values(map); }'),
		typescript('function foo(set: Set<string>) { return Object.entries(set); }'),
		typescript('function foo(set: ReadonlySet<string>) { return Object.keys(set); }'),
		typescript('Object.entries(value as Map<string, number>);'),
		typescript('Object.values(value satisfies Set<string>);'),
		typescript('const map = value as Map<string, number>; Object.entries(map);'),
		typescript('const set = value satisfies Set<string>; Object.values(set);'),
		typescript('const map = <Map<string, number>>value; Object.keys(map);'),
		typescript('const map = value as Map<string, number>; Object.keys(map!);'),
		typeAware('type Items = Map<string, number>; declare const items: Items; Object.keys(items);'),
		typeAware('type Items = ReadonlySet<string>; declare const items: Items; Object.values(items);'),
		typeAware('type Items = Map<string, number> | ReadonlyMap<string, number>; declare const items: Items; Object.entries(items);'),
		'Object.keys(/* keep */ new Map())',
		typescript('Object.values((value as Set<string>));'),
	],
});
