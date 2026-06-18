import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'delete object[key];',
		'map.delete(key);',
		'if (key in object) {}',
		'if (key in object) { object[key]; }',
		'if (key in object) { delete object[otherKey]; }',
		'if (key in object) { delete otherObject[key]; }',
		'if (key in object) { delete object.key; }',
		'if ("key" in object) { delete object[otherKey]; }',
		'if (key in object) { delete object[key]; delete otherObject[otherKey]; }',
		'if (key in object) { delete object[key]; } else { handleMissingKey(); }',
		'if (key in object) { delete object[key]; } else if (otherKey in object) { delete object[otherKey]; }',
		'if (!(key in object)) { delete object[key]; }',
		'if (key in object && otherCheck) { delete object[key]; }',
		'if ("key" in 1) { delete (1)["key"]; }',
		'if ("key" in "value") { delete "value".key; }',
		'if ("key" in null) { delete null["key"]; }',
		'if (getKey() in object) { delete object[getKey()]; }',
		'if (key in getObject()) { delete getObject()[key]; }',
		'if (object.hasOwnProperty(key)) { delete object[key]; }',
		'if (Object.hasOwn(object, key)) { delete object[key]; }',
		'if (map.has(key)) { map.get(key); }',
		'if (map.has(key)) { map.delete(otherKey); }',
		'if (map.has(key)) { otherMap.delete(key); }',
		'if (map.has(key)) { map.delete(key); } else { handleMissingKey(); }',
		'if (map.has(key) && otherCheck) { map.delete(key); }',
		'if (!map.has(key)) { map.delete(key); }',
		'if (map?.has(key)) { map.delete(key); }',
		'if (map.has?.(key)) { map.delete(key); }',
		'if (map[has](key)) { map.delete(key); }',
		'if (map.has(key)) { map[deleteMethod](key); }',
		'if (map.has(...key)) { map.delete(key); }',
		'if (map.has(key)) { map.delete(...key); }',
		'if (cache.has(key)) { cache.delete(key); }',
		'if (map.has(getKey())) { map.delete(getKey()); }',
		'const map = new Map(); if (map.has(getKey())) { map.delete(getKey()); }',
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
		'if (key in object) { delete object[key]; }',
		'if (key in object) delete object[key];',
		'if ("key" in object) { delete object.key; }',
		'if ("key" in object) { delete object["key"]; }',
		'if (1 in object) { delete object[1]; }',
		'if ((key) in (object)) { delete (object)[(key)]; }',
		outdent`
			if (key in object) {
				delete object[key];
			}
		`,
		outdent`
			if (key in object) {
				// Keep this comment.
				delete object[key];
			}
		`,
		'const map = new Map(); if (map.has(key)) { map.delete(key); }',
		'const set = new Set(); if (set.has(value)) { set.delete(value); }',
		'const weakMap = new WeakMap(); if (weakMap.has(key)) { weakMap.delete(key); }',
		'const weakSet = new WeakSet(); if (weakSet.has(value)) { weakSet.delete(value); }',
		'const map = new Map(); if ((map).has((key))) { (map).delete((key)); }',
		outdent`
			const map = new Map();
			if (map.has(key)) {
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
