import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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
		'Object.values(array)',
		'Object.entries(collection)',
		'Object.keys(new WeakMap())',
		'Object.entries(new WeakMap())',
		'Object.keys(new WeakSet())',
		'Object.values(new WeakSet())',
		'Object?.keys(new Map())',
		'Object[method](new Map())',
		'Object["keys"](new Map())',
		'Object["values"](new Set())',
		'Object["entries"](new Map())',
		'Object.keys?.(new Map())',
		'const Object = {keys: value => value}; Object.keys(new Map())',
		'const map = getMap(); map.foo = 1; Object.keys(map);',
		typescript('function foo(map: WeakMap<object, string>) { return Object.keys(map); }'),
		typescript('function foo(set: WeakSet<object>) { return Object.values(set); }'),
		typescript('import {Map} from "immutable"; function foo(map: Map<string, number>) { return Object.keys(map); }'),
		typescript('type Set<T> = {values(): T[]}; function foo(set: Set<string>) { return Object.values(set); }'),
		typeAware('export {}; class Map { keys() { return []; } } const map = new Map(); Object.keys(map);'),
		typeAware('export {}; type Map<K, V> = {keys(): K[]}; declare const map: Map<string, number>; Object.keys(map);'),
		typeAware('interface Collection { keys(): string[]; } declare const collection: Collection; Object.keys(collection);'),
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
	],
});
