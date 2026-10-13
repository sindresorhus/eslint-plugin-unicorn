import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

const linterConfig = {
	plugins: {unicorn: {rules: {'prefer-iterable-in-constructor': rule}}},
	rules: {'unicorn/prefer-iterable-in-constructor': 'error'},
};

function getLoopSuggestion(code, t) {
	const {output, fixed, messages} = new Linter().verifyAndFix(code, linterConfig);
	t.assert.strictEqual(output, code);
	t.assert.strictEqual(fixed, false);
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].fix, undefined);
	t.assert.strictEqual(messages[0].suggestions.length, 1);
	t.assert.strictEqual(messages[0].suggestions[0].messageId, 'prefer-iterable-in-constructor/suggestion');
	const {range, text} = messages[0].suggestions[0].fix;
	return code.slice(0, range[0]) + text + code.slice(range[1]);
}

function getLoopFix(code, t) {
	const {output, fixed, messages} = new Linter().verifyAndFix(code, linterConfig);
	t.assert.strictEqual(fixed, true);
	t.assert.deepStrictEqual(messages, []);
	return output;
}

nodeTest('collection loop suggestions expose source helper initialization changes', t => {
	for (const kind of ['const', 'let', 'var']) {
		for (const [constructor, source, binding, body, result, expected] of [
			['Set', '[collection.size]', 'value', 'collection.add(value);', 'JSON.stringify([...collection])', '[0]'],
			['Map', '[[collection.size, 1]]', '[key, value]', 'collection.set(key, value);', 'JSON.stringify([...collection])', '[[0,1]]'],
			['WeakSet', 'collection.has(key) ? [] : [key]', 'value', 'collection.add(value);', 'collection.has(key)', true],
			['WeakMap', 'collection.has(key) ? [] : [[key, 1]]', '[entryKey, value]', 'collection.set(entryKey, value);', 'collection.get(key)', 1],
			['URLSearchParams', '{items: collection.size}', '[key, value]', 'collection.append(key, value);', 'collection.toString()', 'items=0'],
		]) {
			const iterable = constructor === 'URLSearchParams' ? 'Object.entries(values())' : 'values()';
			const code = outdent`
				const key = {};
				function values() { return ${source}; }
				${kind} collection = new ${constructor}();
				for (const ${binding} of ${iterable}) { ${body} }
				${result};
			`;
			t.assert.strictEqual(runInNewContext(code, {URLSearchParams}), expected, code);
			t.assert.throws(() => runInNewContext(getLoopSuggestion(code, t), {URLSearchParams}), {name: kind === 'var' ? 'TypeError' : 'ReferenceError'});
		}
	}

	const code = outdent`
		function* values() { yield collection.size; yield collection.size; }
		const collection = new Set();
		for (const value of values()) { collection.add(value); }
		JSON.stringify([...collection]);
	`;
	t.assert.strictEqual(runInNewContext(code), '[0,1]');
	t.assert.throws(() => runInNewContext(getLoopSuggestion(code, t)), {name: 'ReferenceError'});

	const captureCode = outdent`
		let captured;
		function values() { captured = collection; return [1, 2]; }
		const collection = new Set();
		for (const value of values()) { collection.add(value); }
		JSON.stringify({values: [...captured], same: captured === collection});
	`;
	t.assert.strictEqual(runInNewContext(captureCode), '{"values":[1,2],"same":true}');
	t.assert.throws(() => runInNewContext(getLoopSuggestion(captureCode, t)), {name: 'ReferenceError'});
});

nodeTest('collection loop autofixes retain ordinary sources and single evaluation', t => {
	for (const [constructor, source, binding, body, result] of [
		['Set', '[1, 2, 2]', 'value', 'collection.add(value);', 'JSON.stringify([...collection])'],
		['Map', '[["a", 1], ["b", 2]]', '[key, value]', 'collection.set(key, value);', 'JSON.stringify([...collection])'],
		['WeakSet', '[key]', 'value', 'collection.add(value);', 'collection.has(key)'],
		['WeakMap', '[[key, 1]]', '[entryKey, value]', 'collection.set(entryKey, value);', 'collection.get(key)'],
		['URLSearchParams', '{name: "value"}', '[key, value]', 'collection.set(key, value);', 'collection.toString()'],
	]) {
		for (const empty of [false, true]) {
			const initializer = empty ? (constructor === 'URLSearchParams' ? '{}' : '[]') : source;
			const iterable = constructor === 'URLSearchParams' ? 'Object.entries(values())' : 'values()';
			const code = outdent`
				const key = {};
				let calls = 0;
				function values() { calls++; return ${initializer}; }
				const collection = new ${constructor}();
				for (const ${binding} of ${iterable}) { ${body} }
				JSON.stringify({result: ${result}, calls});
			`;
			t.assert.strictEqual(runInNewContext(getLoopFix(code, t), {URLSearchParams}), runInNewContext(code, {URLSearchParams}));
			t.assert.strictEqual(JSON.parse(runInNewContext(code, {URLSearchParams})).calls, 1);
		}
	}

	const code = outdent`
		const calls = [];
		let failure;
		function* values() { calls.push("first"); yield 1; calls.push("second"); throw new Error("stop"); }
		try {
			const collection = new Set();
			for (const value of values()) { collection.add(value); }
		} catch (error) {
			failure = error.message;
		}
		JSON.stringify({calls, failure});
	`;
	t.assert.strictEqual(runInNewContext(code), '{"calls":["first","second"],"failure":"stop"}');
	t.assert.strictEqual(runInNewContext(getLoopFix(code, t)), runInNewContext(code));
});

nodeTest('URLSearchParams preserves ordinary non-record const initializers', t => {
	for (const [initializer, expected] of [
		['[["a", "b"]]', '0=a%2Cb'],
		['"a=b"', '0=a&1=%3D&2=b'],
		['5', ''],
		['true', ''],
		['new Map([["a", "b"]])', ''],
		['new Set(["a", "b"])', ''],
		['new Uint8Array([1, 2])', '0=1&1=2'],
		['new URLSearchParams("a=b")', ''],
		['new String("ab")', '0=a&1=b'],
	]) {
		const code = `const values = ${initializer}; new URLSearchParams(Object.entries(values)).toString();`;
		const {output, fixed, messages} = new Linter().verifyAndFix(code, linterConfig);
		t.assert.strictEqual(runInNewContext(code, {URLSearchParams}), expected);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(runInNewContext(output, {URLSearchParams}), expected);
		t.assert.strictEqual(fixed, false);
		t.assert.deepStrictEqual(messages, []);
	}
});

nodeTest('URLSearchParams preserves errors from nullish const sources', t => {
	for (const initializer of ['null', 'undefined']) {
		const code = `const values = ${initializer}; new URLSearchParams(Object.entries(values));`;
		const {output, fixed, messages} = new Linter().verifyAndFix(code, linterConfig);
		t.assert.throws(() => runInNewContext(code, {URLSearchParams}), {name: 'TypeError'});
		t.assert.strictEqual(output, code);
		t.assert.throws(() => runInNewContext(output, {URLSearchParams}), {name: 'TypeError'});
		t.assert.strictEqual(fixed, false);
		t.assert.deepStrictEqual(messages, []);
	}
});

nodeTest('plain const records retain runtime-safe direct constructor autofixes', t => {
	for (const initializer of ['{a: "b", c: "d"}', '{}']) {
		const code = `const record = ${initializer}; new URLSearchParams(Object.entries(record)).toString();`;
		const {output, fixed, messages} = new Linter().verifyAndFix(code, linterConfig);
		t.assert.strictEqual(output, `const record = ${initializer}; new URLSearchParams(record).toString();`);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(output, {URLSearchParams}), runInNewContext(code, {URLSearchParams}));
	}
});

const typescript = code => ({
	code,
	languageOptions: {
		parser: parsers.typescript,
	},
});

test.snapshot({
	valid: [],
	invalid: [
		'function values() { return [collection.size]; } const collection = new Set(); for (const value of ((values()))) { collection.add(value); } collection;',
		'/* before */ const collection = new Set(); for (const value of values) { collection.add(value); } /* after */',
		'const collection = new Set(); for (const value of /* keep */ values) { collection.add(value); }',
		'const collection = new Map(); for (const [key, value] of entries) { /* keep */ collection.set(key, value); }',
		typescript('function values() { return [collection.size]; } const collection = new Set<number>(); for (const value of values()) { collection.add(value); } collection;'),
		typescript('const collection = new Map<string, number>(); for (const [key, value] of (entries as [string, number][])) { collection.set(key, value); } collection;'),
		typescript('const collection = new Set<number>(); for (const value of (values! satisfies Iterable<number>)) { collection.add(value); } collection;'),
		// A hoisted function declaration can run during the loop
		'const collection = new Set(); for (const value of values()) { collection.add(value); } function values() { return [collection.size]; }',
		// A function created after the loop cannot run during the loop
		'function getIds() { const ids = new Set(); for (const user of users) { ids.add(user); } return items.filter(item => ids.has(item.id)); }',
	],
});

test({
	valid: [],
	invalid: [{
		code: 'const collection = new Set()\r\nfor (const value of values) { collection.add(value); }\r\n(() => {})()',
		output: 'const collection = new Set(values);\r\n(() => {})()',
		errors: [{messageId: 'prefer-iterable-in-constructor'}],
	}],
});

test({
	valid: [
		'const values = ["a"]; new URLSearchParams(Object.entries(((values))));',
		'const values = ["a"]; new URLSearchParams(Object.entries(/* keep */ values));',
		'const values = {a: 1, [Symbol.iterator]: function* () {}}; new URLSearchParams(Object.entries(values));',
		'const values = ["a"]; const parameters = new URLSearchParams(); for (const [key, value] of Object.entries(values)) { parameters.append(key, value); }',
		'const entries = [pair]; const map = new Map(); for (const [key, value] of entries) { map.set(key, value); }',
		{
			code: 'const values = ["a"]; const view = <div>{new URLSearchParams(Object.entries(values))}</div>;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		typescript('const values = ["a"] as const; new URLSearchParams(Object.entries(values));'),
		typescript('const values = ["a"]; new URLSearchParams(Object.entries(values as string[]));'),
		typescript('const values = new Map<string, string>(); new URLSearchParams(Object.entries(values!));'),
		typescript('const values = ["a"] satisfies string[]; new URLSearchParams(Object.entries(values satisfies string[]));'),
		typescript('const values = <string[]>["a"]; new URLSearchParams(Object.entries(<string[]>values));'),
	],
	invalid: [
		{
			code: 'const record = {a: "b"}; new URLSearchParams(Object.entries((record)));',
			output: 'const record = {a: "b"}; new URLSearchParams((record));',
			errors: [{messageId: 'prefer-iterable-in-constructor'}],
		},
		{
			code: 'new URLSearchParams(Object.entries(record));',
			output: 'new URLSearchParams(record);',
			errors: [{messageId: 'prefer-iterable-in-constructor'}],
		},
		{
			code: 'const record = {a: "b"}; new URLSearchParams(Object.entries(/* keep */ record));',
			errors: [{messageId: 'prefer-iterable-in-constructor'}],
		},
		{
			...typescript('const record = {a: "b"} satisfies Record<string, string>; new URLSearchParams(Object.entries(record!));'),
			output: 'const record = {a: "b"} satisfies Record<string, string>; new URLSearchParams(record!);',
			errors: [{messageId: 'prefer-iterable-in-constructor'}],
		},
	],
});

test.snapshot({
	valid: [
		'const set = new Set(items);',
		'const map = new Map(entries);',
		'const searchParameters = new URLSearchParams(record);',
		'const set = getSet();\nfor (const item of items) {\n\tset.add(item);\n}',
		'const set = new Set();\ndoSomething();\nfor (const item of items) {\n\tset.add(item);\n}',
		'const set = new Set(existingItems);\nfor (const item of items) {\n\tset.add(item);\n}',
		'const set = new Set();\nfor (const item of items) {\n\tdoSomething(item);\n\tset.add(item);\n}',
		'const set = new Set();\nfor (const item of items) {\n\tset?.add(item);\n}',
		'const set = new Set();\nfor (const item of items) {\n\tset[\'add\'](item);\n}',
		'const set = new Set();\nfor (const item of items) {\n\tset.add(otherItem);\n}',
		'const map = new Map();\nfor (const entry of entries) {\n\tmap.set(entry[0], entry[1]);\n}',
		'const map = new Map();\nfor (const [key, value, extra] of entries) {\n\tmap.set(key, value);\n}',
		'const searchParameters = new URLSearchParams();\nfor (const [key, value] of entries) {\n\tsearchParameters.set(key, value);\n}',
		'const searchParameters = new URLSearchParams();\nfor (const [key, value] of entries) {\n\tsearchParameters.append(key, value);\n}',
		'const formData = new FormData();\nfor (const [key, value] of Object.entries(record)) {\n\tformData.set(key, value);\n}',
		'const set = new Set();\nfor (const item of set) {\n\tset.add(item);\n}',
		'const set = new Set();\nfor (const set of items) {\n\tset.add(set);\n}',
		'const map = new Map();\nfor (const [map, value] of entries) {\n\tmap.set(map, value);\n}',
		'const set = new Set();\nfor (item of items) {\n\tset.add(item);\n}',
		'const set = new Set();\nfor (var item of items) {\n\tset.add(item);\n}',
		'const set = new Set();\nfor (using item of items) {\n\tset.add(item);\n}',
		'const map = new Map();\nfor (const [key, value] of [{0: "a", 1: "b", *[Symbol.iterator]() {}}]) {\n\tmap.set(key, value);\n}',
		'const map = new Map();\nfor (const [key, value] of ["ab"]) {\n\tmap.set(key, value);\n}',
		'const searchParameters = new URLSearchParams();\nfor (const [key, value] of Object.entries({a: 1, *[Symbol.iterator]() {}})) {\n\tsearchParameters.set(key, value);\n}',
		'const searchParameters = new URLSearchParams();\nfor (const [key, value] of Object.entries({a: 1, [symbol]: 2})) {\n\tsearchParameters.set(key, value);\n}',
		'const searchParameters = new URLSearchParams();\nfor (const [key, value] of Object.entries(["a", "b"])) {\n\tsearchParameters.set(key, value);\n}',
		'const searchParameters = new URLSearchParams();\nfor (const [key, value] of Object.entries(undefined)) {\n\tsearchParameters.set(key, value);\n}',
		'new URLSearchParams(entries);',
		'new URLSearchParams(Object.keys(record));',
		'new URLSearchParams(Object.entries({a: 1, *[Symbol.iterator]() {}}));',
		'new URLSearchParams(Object.entries({a: 1, [symbol]: 2}));',
		'new URLSearchParams(Object.entries(["a", "b"]));',
		'new URLSearchParams(Object.entries("ab"));',
		'new URLSearchParams(Object.entries(new Map([["a", "b"]])));',
		'new URLSearchParams(Object.entries(NaN));',
		'new URLSearchParams(Object.entries(-1));',
	],
	invalid: [
		'const set = new Set();\nfor (const item of items) {\n\tset.add(item);\n}',
		'let set = new Set();\nfor (const item of items) {\n\tset.add(item);\n}',
		'const weakSet = new WeakSet();\nfor (const item of items) {\n\tweakSet.add(item);\n}',
		'const map = new Map();\nfor (const [key, value] of entries) {\n\tmap.set(key, value);\n}',
		'const map = new Map();\nfor (const [key, value] of Object.entries(record)) {\n\tmap.set(key, value);\n}',
		'const map = new Map();\nfor (const [key, value] of [["a", "b"]]) {\n\tmap.set(key, value);\n}',
		'const weakMap = new WeakMap();\nfor (const [key, value] of entries) {\n\tweakMap.set(key, value);\n}',
		'const searchParameters = new URLSearchParams();\nfor (const [key, value] of Object.entries(record)) {\n\tsearchParameters.set(key, value);\n}',
		'const searchParameters = new URLSearchParams();\nfor (const [key, value] of Object.entries(record)) {\n\tsearchParameters.append(key, value);\n}',
		'const set = new Set();\nfor (const item of (items)) {\n\tset.add(item);\n}',
		typescript('const set = new Set<string>();\nfor (const item of items) {\n\tset.add(item);\n}'),
		'new URLSearchParams(Object.entries(record));',
		'new URLSearchParams(Object.entries((record)));',
	],
});

// A loop body without braces
test.snapshot({
	valid: [],
	invalid: [
		'const set = new Set();\nfor (const item of items)\n\tset.add(item);',
		'const set = new Set();\nfor (const item of items) set.add(item);\nfoo();',
	],
});

// Removing the loop exposes the declaration to the following statement
test.snapshot({
	valid: [],
	invalid: [
		'const set = new Set()\nfor (const item of items) {\n\tset.add(item);\n}\n(bar)',
		'const set = new Set()\nfor (const item of items) {\n\tset.add(item);\n}\n[bar]',
		'const set = new Set()\nfor (const item of items) {\n\tset.add(item);\n}\nbar()',
	],
});

test.snapshot({
	valid: [],
	invalid: [
		'const set = new Set();\nfor (const item of items) {\n\tset.add(item);\n\t// Keep this.\n}',
		'const set = new Set();\n// Keep this with the fill loop.\nfor (const item of items) {\n\tset.add(item);\n}',
		'new URLSearchParams(Object.entries(/* Keep this. */ record));',
	],
});
