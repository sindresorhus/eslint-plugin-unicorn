import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'delete object[key];',
		'map.delete(key);',
		'if (key in object) {}',
		'if (key in object) { object[key]; }',
		'if (key in object) { delete object[key]; }',
		'if (key in object) delete object[key];',
		'const object = new Foo(); if (key in object) { delete object[key]; }',
		'if ("key" in object) { delete object.key; }',
		'if ("key" in object) { delete object["key"]; }',
		'if (1 in object) { delete object[1]; }',
		'const object = {}; if (key in object) { delete object[otherKey]; }',
		'const object = {}; if (key in object) { delete otherObject[key]; }',
		'const object = {}; if (key in object) { delete object.key; }',
		'const object = {}; if ("key" in object) { delete object[otherKey]; }',
		'const object = {}; if (key in object) { delete object[key]; delete otherObject[otherKey]; }',
		'const object = {}; if (key in object) { delete object[key]; } else { handleMissingKey(); }',
		'const object = {}; if (key in object) { delete object[key]; } else if (otherKey in object) { delete object[otherKey]; }',
		'const object = {}; if (!(key in object)) { delete object[key]; }',
		'const object = {}; if (key in object && otherCheck) { delete object[key]; }',
		'if ("key" in 1) { delete (1)["key"]; }',
		'if ("key" in "value") { delete "value".key; }',
		'if ("key" in null) { delete null["key"]; }',
		'if (key in object) { delete object?.[key]; }',
		'const object = {}; if (getKey() in object) { delete object[getKey()]; }',
		'const object = {}; if (key in object) { delete object[getKey()]; }',
		'if (key in getObject()) { delete getObject()[key]; }',
		'function object() {} if ("key" in object) { delete object.key; }',
		'class ObjectLike {} if ("key" in ObjectLike) { delete ObjectLike.key; }',
		'if (object.hasOwnProperty(key)) { delete object[key]; }',
		'if (Object.hasOwn(object, key)) { delete object[key]; }',
		'const map = new Map(); if (map.has(key)) { map.get(key); }',
		'const map = new Map(); if (map.has(key)) { map.delete(otherKey); }',
		'const map = new Map(); if (map.has(key)) { otherMap.delete(key); }',
		'const map = new Map(); if (map.has(key)) { map.delete(key); } else { handleMissingKey(); }',
		'const map = new Map(); if (map.has(key) && otherCheck) { map.delete(key); }',
		'const map = new Map(); if (!map.has(key)) { map.delete(key); }',
		'const map = new Map(); if (map?.has(key)) { map.delete(key); }',
		'const map = new Map(); if (map.has?.(key)) { map.delete(key); }',
		'const map = new Map(); if (map[has](key)) { map.delete(key); }',
		'const map = new Map(); if (map.has(key)) { map[deleteMethod](key); }',
		'const map = new Map(); if (map.has(...key)) { map.delete(key); }',
		'const map = new Map(); if (map.has(key)) { map.delete(...key); }',
		'if (cache.has(key)) { cache.delete(key); }',
		'const Map = CustomMap; const map = new Map(); if (map.has(key)) { map.delete(key); }',
		'let map = new Map(); if (map.has(key)) { map.delete(key); }',
		'if (map.has(getKey())) { map.delete(getKey()); }',
		'const map = new Map(); if (map.has(getKey())) { map.delete(getKey()); }',
		'const weakMap = new WeakMap(); if (weakMap.has({})) { weakMap.delete({}); }',
		'class CustomMap extends Map { delete() { throw new Error(); } } const map = new CustomMap(); if (map.has(key)) { map.delete(key); }',
		'class CustomSet extends Set { delete() { throw new Error(); } } const set = new CustomSet(); if (set.has(value)) { set.delete(value); }',
		{
			code: 'function f(cache: {has(key: string): boolean; delete(key: string): boolean}, key: string) { if (cache.has(key)) { cache.delete(key); } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(object: string, key: string) { if (key in object) { delete object[key]; } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(object: string, key: string) { if (key in object!) { delete object![key]; } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(object: {}, key: string) { if (key in object) { delete object[key]; } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(object: {[key: string]: unknown}, key: string) { if (key in object) { delete object[key]; } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(object: object & {foo?: unknown}, key: string) { if (key in object) { delete object[key]; } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(map: Map<string, number>, key: string) { if (map.has(key)) { map.delete(key); } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(set: Set<string>, value: string) { if (set.has(value as string)) { set.delete(value as string); } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'interface CustomMap<K, V> extends Map<K, V> { delete(key: K): boolean; } function f(map: CustomMap<string, number>, key: string) { if (map.has(key)) { map.delete(key); } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type CustomMap = Map<string, number> & {delete(key: string): boolean}; function f(map: CustomMap, key: string) { if (map.has(key)) { map.delete(key); } }',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'const object = {}; if (key in object) { delete object[key]; }',
		'const object = {}; if (key in object) delete object[key];',
		'const object = {}; if ("key" in object) { delete object.key; }',
		'const object = {}; if ("key" in object) { delete object["key"]; }',
		'const object = {}; if (1 in object) { delete object[1]; }',
		'const object = {}; if ((key) in (object)) { delete (object)[(key)]; }',
		'const object = []; if (key in object) { delete object[key]; }',
		'const object = /regexp/; if ("source" in object) { delete object.source; }',
		'const object = () => {}; if ("key" in object) { delete object.key; }',
		'const object = function () {}; if ("key" in object) { delete object.key; }',
		'const object = class {}; if ("key" in object) { delete object.key; }',
		outdent`
			const object = {};
			if (key in object) {
				delete object[key];
			}
		`,
		outdent`
			const object = {};
			if (key in object) {
				// Keep this comment.
				delete object[key];
			}
		`,
		'const object = {}; if (/* comment */ key in object) { delete object[key]; }',
		{
			code: 'function f(object: object, key: string) { if (key in object) { delete object[key]; } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(object: object, key: string) { if (key in object!) { delete object![key]; } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(value: unknown, key: string) { if (key in (value as object)) { delete (value as object)[key]; } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(value: unknown, key: string) { if (key in (value as new () => object)) { delete (value as new () => object)[key]; } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(object: object | (() => void), key: string) { if (key in object) { delete object[key]; } }',
			languageOptions: {parser: parsers.typescript},
		},
		'const map = new Map(); if (map.has(key)) { map.delete(key); }',
		'const map = new Map(); if (map.has(key)) map.delete(key);',
		'const map = new Map(); if (map.has("key")) { map.delete("key"); }',
		'const map = new Map(); if (map.has(1)) { map.delete(1); }',
		'const set = new Set(); if (set.has(value)) { set.delete(value); }',
		'const weakMap = new WeakMap(); if (weakMap.has(key)) { weakMap.delete(key); }',
		'const weakSet = new WeakSet(); if (weakSet.has(value)) { weakSet.delete(value); }',
		'const map = new Map(); if ((map).has((key))) { (map).delete((key)); }',
		{
			code: 'const map = new Map(); if (map.has(key as string)) { map.delete(key as string); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const map = new Map() as Map<string, number>; if (map.has(key)) { map.delete(key); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const map = new Map() satisfies Map<string, number>; if (map.has(key)) { map.delete(key); }',
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			const map = new Map();
			if (map.has(key)) {
				map.delete(key);
			}
		`,
		outdent`
			const map = new Map();
			if (/* comment */ map.has(key)) {
				map.delete(key);
			}
		`,
		outdent`
			const map = new Map();
			if (map.has(key)) {
				// Keep this comment.
				map.delete(key);
			}
		`,
		outdent`
			const map = new Map();
			if (map.has(key)) {
				map.delete(key)
			}
			(function () {})();
		`,
		outdent`
			const map = new Map()
			if ((map).has(key)) {
				(map).delete(key);
			}
		`,
	],
});
