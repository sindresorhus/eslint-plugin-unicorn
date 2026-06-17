import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Known non-Map receiver (type information)
		{
			code: 'function f(cache: {has(key: string): boolean; get(key: string): number}) { if (cache.has("a")) { return cache.get("b"); } }',
			languageOptions: {parser: parsers.typescript},
		},
		'map.has(key) ? map.get(key) : value;',
		'!map.has(key) ? map.set(key, value) : value;',
		'if (map.has(key)) { const value = map.get(key); }',
		'if (!map.has(key)) { map.set(key, value); }',
		'if (map.has(key)) { otherMap.get(anotherKey); }',
		'if (map.has(key)) { map.get(getKey()); }',
		'if (map.has(getKey())) { map.get(anotherKey); }',
		'if (map.has(...key)) { map.get(anotherKey); }',
		'if (map.has(key)) { map.set(anotherKey, ...values); }',
		'if (map?.has(key)) { map.get(anotherKey); }',
		'if (map.has?.(key)) { map.get(anotherKey); }',
		'if (map[has](key)) { map.get(anotherKey); }',
		'if (map.has(key)) { map[get](anotherKey); }',
		'if (map.has(key) && other) { map.get(anotherKey); }',
		'if (map.has(1 + 1)) { map.get(2); }',
		'if (map.has(NaN)) { map.get(NaN); }',
		'if (map.has(-0)) { map.get(0); }',
		'if (map.has(String("key"))) { map.get("anotherKey"); }',
		'if (map.has(key)) { const map = otherMap, value = map.get(anotherKey); }',
		'if (cache.map.has(key)) { const cache = otherCache, value = cache.map.get(anotherKey); }',
		'if (map.has(key)) { const {map} = cache, value = map.get(anotherKey); }',
		'if (map.has(key)) { try {} catch (map) { map.get(anotherKey); } }',
		'if (map.has(key)) { for (map of maps) { map.get(anotherKey); } }',
		'if (map.has(key)) { map = otherMap; map.get(anotherKey); }',
		'if (map.has(key)) { var map = otherMap; map.get(anotherKey); }',
		'if (map.has(key)) { (map.get(anotherKey), map = otherMap); }',
		'if (cache.map.has(key)) { (cache.map = otherMap, cache.map.get(anotherKey)); }',
		'if (cache.map.has(key)) { for (cache.map of maps) { cache.map.get(anotherKey); } }',
		'if (map.has(key)) { ({map} = other); map.get(anotherKey); }',
		'if (map.has(key)) { var {map} = other; map.get(anotherKey); }',
		'if (map.has(key)) { for ({map} of maps) { map.get(anotherKey); } }',
		'if (map.has(key)) { if (map.has(anotherKey)) { map.get(anotherKey); } }',
		'if (map.has(key)) { map.has(anotherKey) ? map.get(anotherKey) : value; }',
		'if (map.has(key)) { if (!map.has(anotherKey)) { map.set(anotherKey, value); } }',
		'if (map.has(key)) { if (condition && map.has(anotherKey)) { map.get(anotherKey); } }',
		'if (map.has(key)) { condition && map.has(anotherKey) ? map.get(anotherKey) : value; }',
		'if (map.has(true ? String("key") : "x")) { map.get("anotherKey"); }',
		'if (map.has(key)) { map.property = value; map.get(anotherKey); }',
		outdent`
			if (map.has(key)) {
				map.set(key, value);
				map.set(anotherKey, value);
			}
		`,
		outdent`
			if (map.has(key)) {
				for (const map of maps) {
					map.get(anotherKey);
				}
			}
		`,
		outdent`
			if (map.has(key)) {
				for (const item of items) {
					const map = otherMap;
					map.get(anotherKey);
				}
			}
		`,
		outdent`
			if (map.has(key)) {
				for (const item of items) {
					class map {}
					map.get(anotherKey);
				}
			}
		`,
		outdent`
			if (map.has(key)) {
				for (const item of items) {
					function map() {}
					map.get(anotherKey);
				}
			}
		`,
		outdent`
			if (map.has(key)) {
				function getValue() {
					return map.get(anotherKey);
				}
			}
		`,
		outdent`
			if (map.has(key)) {
				class Value {
					static value = map.get(anotherKey);
				}
			}
		`,
		{
			code: 'if (map.has(key as string)) { map.get(key); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		// Known Map receiver is still flagged (type information)
		{
			code: 'function f(map: Map<string, number>) { if (map.has("a")) { return map.get("b"); } }',
			languageOptions: {parser: parsers.typescript},
		},
		'map.has(key) ? map.get(anotherKey) : value;',
		'map.has(key) ? map.set(anotherKey, value) : value;',
		// `WeakMap` has the same has/get/set shape and is flagged too
		'if (weakMap.has(key)) { weakMap.get(anotherKey); }',
		'weakMap.has(key) ? weakMap.get(anotherKey) : value;',
		'if (map.has(key)) { const value = map.get(anotherKey); }',
		'if (map.has(key)) { map.set(anotherKey, value); }',
		'if (!map.has(key)) { const value = map.get(anotherKey); }',
		'if (!map.has(key)) { map.set(anotherKey, value); }',
		'map.has(key) ? value : map.get(anotherKey);',
		'!map.has(key) ? value : map.get(anotherKey);',
		'if (map.has(key)) {} else { map.get(anotherKey); }',
		'if (!map.has(key)) {} else { map.get(anotherKey); }',
		'if (map.has(key)) { for (const item of items) { map.get(anotherKey); } }',
		'map.has(key) ? (map.has(key) ? map.get(anotherKey) : value) : value;',
		'if (map.has(key)) { if (condition) { map.get(anotherKey); } }',
		'if (map.has(key)) { condition ? map.get(anotherKey) : value; }',
		'if (map.has(key)) { const key = anotherKey, value = map.get(key); }',
		'if (map.has(object.key)) { const object = other, value = map.get(object.key); }',
		'if (map.has("key")) { map.get("anotherKey"); }',
		'if (map.has(1)) { map.get(2); }',
		'if (map.has(object.key)) { map.get(object.anotherKey); }',
		'if (this.map.has(this.key)) { this.map.get(this.anotherKey); }',
		{
			code: 'if (map.has(key as string)) { map.get(anotherKey as string); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
