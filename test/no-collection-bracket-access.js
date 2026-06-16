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
		// Correct usage
		'const map = new Map(); map.get("foo");',
		'const map = new Map(); map.set("foo", "bar");',
		'const map = new Map(); map.has("foo");',
		'const map = new Map(); map.delete("foo");',
		'const set = new Set(); set.add("foo");',
		'const set = new Set(); set.has("foo");',
		'const weakMap = new WeakMap(); weakMap.get(key);',
		'const weakSet = new WeakSet(); weakSet.add(key);',

		// Bracket access to a real member
		'const map = new Map(); map["size"];',
		'const map = new Map(); map["get"]("foo");',
		'const map = new Map(); map["set"]("foo", "bar");',
		'const set = new Set(); set["has"]("foo");',
		'const set = new Set(); set["union"](other);',
		'const set = new Set(); set["size"];',
		'const weakMap = new WeakMap(); weakMap["delete"](key);',
		'const weakSet = new WeakSet(); weakSet["add"](key);',

		// Well-known `Symbol` keys
		'const map = new Map(); map[Symbol.iterator];',
		'const map = new Map(); map[Symbol.toStringTag];',

		// Inherited `Object.prototype` members
		'const map = new Map(); map["toString"];',
		'const map = new Map(); map["hasOwnProperty"]("foo");',
		'const map = new Map(); map["constructor"];',

		// Key resolves to a member name through a variable
		'const map = new Map(); const key = "size"; map[key];',

		// Not a known collection
		'array[0];',
		'array["length"];',
		'object["foo"];',
		'object["foo"] = "bar";',
		'delete object["foo"];',
		'foo[0] = 1;',

		// Receiver not provably a collection
		'let map = new Map(); map = something; map["foo"];',
		'function foo(map) { return map["foo"]; }',
		'const map = getMap(); map["foo"];',
		// Member receivers are not resolved without type information
		'const cache = {map: new Map()}; cache.map["foo"] = "bar";',
		'class Foo { map = new Map(); bar() { this.map["foo"] = "bar"; } }',
	],
	invalid: [
		// Read
		'const map = new Map(); map["foo"];',
		'const map = new Map(); map[key];',
		'const map = new Map(); map[0];',
		'const map = new Map(); const value = map["foo"];',
		'const map = new Map(); if (map["foo"]) {}',
		'const set = new Set(); set["foo"];',
		'const weakMap = new WeakMap(); weakMap[key];',
		'const weakSet = new WeakSet(); weakSet[key];',
		// A non-well-known `Symbol` key is still a bracket access, not a collection entry
		'const map = new Map(); const symbol = Symbol("x"); map[symbol];',
		// A registered `Symbol` is a data key, not a prototype member
		'const map = new Map(); map[Symbol.for("foo")] = value;',
		// Key resolves to a non-member string through a variable
		'const map = new Map(); const key = "foo"; map[key];',
		// Dynamic template key
		'const map = new Map(); map[`${prefix}foo`];',

		// Write (with suggestion for Map/WeakMap)
		'const map = new Map(); map["foo"] = "bar";',
		'const map = new Map(); map[key] = value;',
		'const weakMap = new WeakMap(); weakMap[key] = value;',
		'const map = new Map(); map["foo"] += 1;',
		'const map = new Map(); map["foo"]++;',
		'const map = new Map(); ++map["foo"];',
		'const map = new Map(); map["foo"] ??= "bar";',
		// Destructuring assignment target
		'const map = new Map(); [map["foo"]] = array;',
		// `for-of`/`for-in` assignment target
		'const map = new Map(); for (map["foo"] of array) {}',
		'const map = new Map(); for (map["foo"] in object) {}',
		// Parenthesized sequence value keeps its parentheses in the suggestion
		'const map = new Map(); map["foo"] = (a, b);',
		// Set/WeakSet write: no suggestion
		'const set = new Set(); set["foo"] = 1;',
		'const weakSet = new WeakSet(); weakSet[key] = 1;',

		// Delete (with suggestion)
		'const map = new Map(); delete map["foo"];',
		'const set = new Set(); delete set["foo"];',
		'const weakMap = new WeakMap(); delete weakMap[key];',

		// Optional access: report, no suggestion
		'const map = new Map(); map?.["foo"];',
		'const map = new Map(); delete map?.["foo"];',

		// Suggestion bails: value of the assignment/deletion is used
		'const map = new Map(); const x = (map["foo"] = "bar");',
		'const map = new Map(); if (delete map["foo"]) {}',
		// Suggestion bails: non-simple receiver
		'const map = new Map(); (cond ? map : map)["foo"] = "bar";',
		// Suggestion bails: comment inside
		'const map = new Map(); map["foo"] = /* keep */ "bar";',

		// Parenthesized object
		'const map = new Map(); (map)["foo"];',

		// Chained read off the bracket access
		'const map = new Map(); map["foo"].bar;',
		// Nested: both the outer Map and the Map used as the key are reported
		'const map = new Map(); const key = new Map(); map[key["foo"]];',
		// `delete` inside a sequence: report, no suggestion
		'const map = new Map(); (delete map["foo"], 1);',
		// `new Map()` receiver directly: report, no suggestion (not a simple receiver)
		'new Map()["foo"] = "bar";',

		// TypeScript (annotation only)
		typescript('function foo(map: Map<string, number>) { return map["foo"]; }'),
		typescript('function foo(map: Map<string, number>) { map["foo"] = 1; }'),
		typescript('declare const map: Map<string, number>; (map as Map<string, number>)["foo"];'),
		typescript('declare const map: Map<string, number>; map!["foo"];'),

		// TypeScript (type-aware: member receiver resolves, suggestion applies)
		typeAware('function foo(cache: {map: Map<string, number>}) { cache.map["foo"] = 1; }'),
		typeAware('function foo(set: Set<string>) { set["foo"] = 1; }'),
	],
});
