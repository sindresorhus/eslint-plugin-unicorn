import nodeTest from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

for (const [description, statement, expected] of [
	['continue', 'try { set.delete(value); } finally { continue; }', 'done'],
	['break', 'try { set.delete(value); } finally { break; }', 'done'],
	['return', 'try { set.delete(value); } finally { return "returned"; }', 'returned'],
	['throw', 'try { set.delete(value); } finally { throw new Error("failure"); }', 'failure'],
	['catch delete', 'try { throw 1; } catch { set.delete(value); } finally { continue; }', 'done'],
]) {
	nodeTest(`a ${description} finalizer leaves no reachable reinsertion`, t => {
		const code = outdent`
			const set = new Set([1]);
			let additions = 0;
			function run() {
				outer: for (const value of set) {
					${statement}
					additions++;
					set.add(value);
				}
				return "done";
			}
			let result;
			try { result = run(); } catch (error) { result = error.message; }
			JSON.stringify({size: set.size, additions, result});
		`;
		const messages = new Linter().verify(code, {
			plugins: {unicorn: {rules: {'no-loop-iterable-mutation': rule}}},
			rules: {'unicorn/no-loop-iterable-mutation': 'error'},
		});
		t.assert.strictEqual(runInNewContext(code), JSON.stringify({size: 0, additions: 0, result: expected}));
		t.assert.deepStrictEqual(messages, []);
	});
}

for (const binding of ['const key of map.keys()', 'const [key] of map']) {
	nodeTest(`a jumping finalizer skips Map reinsertion with ${binding}`, t => {
		const code = outdent`
			const map = new Map([[1, 2]]); let additions = 0;
			for (${binding}) { try { map.delete(key); } finally { continue; } additions++; map.set(key, 2); }
			JSON.stringify({size: map.size, additions});
		`;
		const messages = new Linter().verify(code, {
			plugins: {unicorn: {rules: {'no-loop-iterable-mutation': rule}}},
			rules: {'unicorn/no-loop-iterable-mutation': 'error'},
		});
		t.assert.strictEqual(runInNewContext(code), '{"size":0,"additions":0}');
		t.assert.deepStrictEqual(messages, []);
	});
}

for (const statement of [
	'try { set.delete(value); } finally { events.push("final"); }',
	// A `break` inside the finalizer that only leaves an inner loop
	'try { set.delete(value); } finally { events.push("final"); while (true) { break; } }',
]) {
	nodeTest(`a finalizer reaching reinsertion is still reported for ${statement}`, t => {
		const code = `const set = new Set([1]); const events = []; for (const value of set) { ${statement} set.add(value); events.push("add"); break; } JSON.stringify({size: set.size, events});`;
		const messages = new Linter().verify(code, {
			plugins: {unicorn: {rules: {'no-loop-iterable-mutation': rule}}},
			rules: {'unicorn/no-loop-iterable-mutation': 'error'},
		});
		t.assert.strictEqual(runInNewContext(code), '{"size":1,"events":["final","add"]}');
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].messageId, 'no-loop-iterable-mutation');
	});
}

test({
	valid: [
		'const set = new Set([1]); for (const value of set) { try { /* keep */ set.delete(value); } finally { continue; } set.add(value); }',
		'const set = new Set([1]);\r\nfor (const value of set) {\r\n  try { set.delete(value); } finally { continue; }\r\n  set.add(value);\r\n}',
		{
			code: 'const set = new Set<number>([1]); for (const value of (set as Set<number>)) { try { set.delete(value); } finally { continue; } set.add(value); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [],
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
		outdent`
			for (const item of items) {
				otherItems.push(item);
			}
		`,
		outdent`
			for (const item of [...items]) {
				items.push(item);
			}
		`,
		outdent`
			for (const item of Array.from(items)) {
				items.push(item);
			}
		`,
		outdent`
			for (const key of Object.keys(object)) {
				delete object[key];
			}
		`,
		outdent`
			for (const value of Object.values(object)) {
				object.extra = value;
			}
		`,
		outdent`
			for (const [key] of Object.entries(object)) {
				delete object[key];
			}
		`,
		outdent`
			for (const item of items) {
				function later() {
					items.push(item);
				}
			}
		`,
		outdent`
			for (const item of items) {
				const later = () => {
					items.push(item);
				};
			}
		`,
		outdent`
			for (const item of items) {
				class Later {
					method() {
						items.push(item);
					}
				}
			}
		`,
		outdent`
			for (const item of items) {
				{
					const items = [];
					items.push(item);
				}
			}
		`,
		outdent`
			for (const item of object.items) {
				{
					const object = {items: []};
					object.items.push(item);
				}
			}
		`,
		outdent`
			for (const item of collections[index]) {
				{
					const index = otherIndex;
					collections[index].push(item);
				}
			}
		`,
		outdent`
			for (const item of items) {
				items[method](item);
			}
		`,
		outdent`
			for (const item of items) {
				items.notMutating(item);
			}
		`,
		outdent`
			const items = [];
			for (const item of items) {
				items.add(item);
			}
		`,
		outdent`
			const set = new Set();
			for (const value of set) {
				set.push(value);
			}
		`,
		outdent`
			const map = new Map();
			for (const [key] of map) {
				map.add(key);
			}
		`,
		{
			code: outdent`
				const items = [] as string[] & {add(item: string): void};
				for (const item of items) {
					items.add(item);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				const set = new Set<string>() as Set<string> & {push(value: string): void};
				for (const value of set) {
					set.push(value);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				const map = new Map<string, number>() as Map<string, number> & {add(value: string): void};
				for (const [key] of map) {
					map.add(key);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			for (const item of items.values(argument)) {
				items.push(item);
			}
		`,
		outdent`
			for (const item of items?.values()) {
				items.push(item);
			}
		`,
		outdent`
			for (const item of items.values?.()) {
				items.push(item);
			}
		`,
		outdent`
			for await (const item of items) {
				items.push(item);
			}
		`,
		outdent`
			for (const value of set) {
				set.add(value);
			}
		`,
		outdent`
			for (const value of set) {
				set.delete(value);
			}
		`,
		outdent`
			for (const value of set.values()) {
				set.add(value);
			}
		`,
		{
			code: outdent`
				const set: Set<string> = new Set();
				for (const value of set.values()) {
					set.delete(value);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			const set = new Set();
			for (const value of set.values()) {
				set.delete(value);
			}
		`,
		typeAware(outdent`
			declare function getSet(): Set<string>;
			const set = getSet();
			for (const value of set.values()) {
				set.delete(value);
			}
		`),
		outdent`
			for (const value of set['values']()) {
				set.add(value);
			}
		`,
		outdent`
			for (const value of set.keys()) {
				set.add(value);
			}
		`,
		outdent`
			for (const value of set['keys']()) {
				set.add(value);
			}
		`,
		outdent`
			for (const [value] of set.entries()) {
				set.add(value);
			}
		`,
		outdent`
			for (const [value] of set.entries()) {
				set.delete(value);
			}
		`,
		outdent`
			for (const [value] of set['entries']()) {
				set.add(value);
			}
		`,
		outdent`
			for (const key of set.keys()) {
				set.delete(key);
			}
		`,
		outdent`
			for (const key of set['keys']()) {
				set.delete(key);
			}
		`,
		outdent`
			for (const [value] of set) {
				set.delete(value);
			}
		`,
		outdent`
			for (const value of set) {
				if (shouldDelete) {
					set.delete(value);
				} else {
					set.add(value);
				}
			}
		`,
		outdent`
			for (const value of set) {
				if (shouldDelete) {
					set.delete(value);
					continue;
				}

				set.add(value);
			}
		`,
		outdent`
			for (const value of set) {
				set.delete(value), set.add(value);
			}
		`,
		outdent`
			for (const key of map.keys()) {
				map.set(key, value);
			}
		`,
		outdent`
			for (const key of map['keys']()) {
				map.set(key, value);
			}
		`,
		outdent`
			for (const key of map.keys()) {
				map.delete(key);
			}
		`,
		outdent`
			for (const key of map['keys']()) {
				map.delete(key);
			}
		`,
		outdent`
			for (const [key] of map) {
				map.set(key, value);
			}
		`,
		outdent`
			for (const [key] of map) {
				map.delete(key);
			}
		`,
		outdent`
			for (const [key] of map.entries()) {
				map.set(key, value);
			}
		`,
		outdent`
			for (const [key] of map['entries']()) {
				map.set(key, value);
			}
		`,
		outdent`
			for (const [key] of map.entries()) {
				map.delete(key);
			}
		`,
		outdent`
			for (const [key] of map['entries']()) {
				map.delete(key);
			}
		`,
		// `entry` is the whole `[key, value]` pair, so `map.delete(entry)` looks up an array that is not a key and removes nothing, whichever way the pair is bound
		outdent`
			for (const entry of map) {
				map.delete(entry);
			}
		`,
		{
			code: outdent`
				const map: Map<string, number> = new Map();
				for (const entry of map) {
					map.delete(entry);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			const map = new Map();
			for (const entry of map) {
				map.delete(entry);
			}
		`,
		outdent`
			for (const key of map.keys()) {
				if (shouldDelete) {
					map.delete(key);
				} else {
					map.set(key, value);
				}
			}
		`,
		outdent`
			for (const [key, value] of map) {
				if (shouldDelete) {
					map.delete(key);
					continue;
				}

				map.set(key, value);
			}
		`,
		outdent`
			for (const value of set) {
				switch (kind) {
					case 'delete':
						set.delete(value);
						continue;
				}

				set.add(value);
			}
		`,
		outdent`
			const iterator = items.values();
			for (const item of iterator) {
				items.push(item);
			}
		`,
		outdent`
			for (const value of set) {
				for (const innerValue of set) {
					set.add(innerValue);
				}
			}
		`,
		outdent`
			for (const [key, value] of map) {
				for (const [innerKey, innerValue] of map) {
					map.set(innerKey, innerValue);
				}
			}
		`,
		// Not an iterator method
		'for (const value of foo.toArray()) { foo.push(value); }',
		// The iterator method is not called on a reference
		'for (const value of getSet().keys()) { foo.push(value); }',
		// Calls that are not member calls are ignored
		'for (const value of array) { foo(value); }',
		// The loop body is not a block
		'for (const value of set) set.add(value);',
		// Earlier statements that are not calls do not delete the current item
		outdent`
			for (const value of set) {
				let count;
				count = 1;
				set.add(value);
			}
		`,
		// The `else` branch that would delete leaves the loop
		outdent`
			for (const value of set) {
				if (condition) {
					foo();
				} else {
					continue;
				}

				set.add(value);
			}
		`,
	],
	invalid: [
		outdent`
			for (const item of items) {
				items.push(item);
			}
		`,
		outdent`
			for (const item of items) {
				items.unshift(item);
			}
		`,
		outdent`
			for (const item of items) {
				items.pop();
			}
		`,
		outdent`
			for (const item of items) {
				items.shift();
			}
		`,
		outdent`
			for (const item of items) {
				items.splice(0, 1);
			}
		`,
		outdent`
			for (const item of items) {
				items.sort();
			}
		`,
		outdent`
			for (const item of items) {
				items.reverse();
			}
		`,
		outdent`
			for (const item of items) {
				items.fill(item);
			}
		`,
		outdent`
			for (const item of items) {
				items.copyWithin(0, 1);
			}
		`,
		outdent`
			for (const item of items) {
				items?.push(item);
			}
		`,
		outdent`
			for (const item of items) {
				items.push?.(item);
			}
		`,
		outdent`
			for (const item of items) {
				items['push'](item);
			}
		`,
		outdent`
			for (const item of items.values()) {
				items.push(item);
			}
		`,
		outdent`
			for (const item of items['values']()) {
				items.push(item);
			}
		`,
		outdent`
			for (const index of items.keys()) {
				items.pop();
			}
		`,
		outdent`
			for (const index of items['keys']()) {
				items.pop();
			}
		`,
		outdent`
			for (const [index, item] of items.entries()) {
				items.push(item);
			}
		`,
		outdent`
			for (const [index, item] of items['entries']()) {
				items.push(item);
			}
		`,
		outdent`
			for (const item of this.items) {
				this.items.push(item);
			}
		`,
		outdent`
			for (const item of object.items) {
				object.items.push(item);
			}
		`,
		outdent`
			for (const item of collections[index]) {
				collections[index].push(item);
			}
		`,
		outdent`
			for (const item of (items)) {
				(items).push(item);
			}
		`,
		outdent`
			for (const value of set) {
				set.add(value + 1);
			}
		`,
		outdent`
			for (const value of set) {
				set.clear();
			}
		`,
		outdent`
			for (const value of set.values()) {
				set.add(otherValue);
			}
		`,
		outdent`
			for (const value of set.values()) {
				set.delete(value);
			}
		`,
		outdent`
			const set = new Set();
			for (const value of set.values()) {
				set.delete(value);
				set.add(value);
			}
		`,
		outdent`
			for (const value of set['values']()) {
				set.delete(value);
			}
		`,
		outdent`
			for (let value of set) {
				set.add(value);
			}
		`,
		outdent`
			for (let value of set) {
				set.delete(value);
			}
		`,
		outdent`
			for (let value of set) {
				value = otherValue;
				set.add(value);
			}
		`,
		outdent`
			for (let value of set) {
				value++;
				set.add(value);
			}
		`,
		outdent`
			for (let value of set) {
				value = otherValue;
				set.delete(value);
			}
		`,
		outdent`
			for (const value of set) {
				set.delete(value);
				set.add(value);
			}
		`,
		outdent`
			for (const value of set) {
				{
					set.delete(value);
				}

				set.add(value);
			}
		`,
		outdent`
			for (const value of set.keys()) {
				set.delete(value);
				set.add(value);
			}
		`,
		outdent`
			for (const value of set['keys']()) {
				set.delete(value);
				set.add(value);
			}
		`,
		outdent`
			for (const [value] of set.entries()) {
				set.delete(value);
				set.add(value);
			}
		`,
		outdent`
			for (const [value] of set['entries']()) {
				set.delete(value);
				set.add(value);
			}
		`,
		outdent`
			for (const value of set) {
				if (shouldDelete) {
					set.delete(value);
				}

				set.add(value);
			}
		`,
		outdent`
			for (const value of set) {
				{
					const value = otherValue;
					set.add(value);
				}
			}
		`,
		outdent`
			for (const [key, value] of map) {
				map.set(otherKey, value);
			}
		`,
		outdent`
			const map = new Map();
			for (const entry of map) {
				map.set(entry, value);
			}
		`,
		{
			code: outdent`
				const set: Set<[string]> = new Set();
				for (const [value] of set) {
					set.delete(value);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			const set = new Set([['value']]);
			for (const [value] of set) {
				set.delete(value);
			}
		`,
		outdent`
			for (const key of map.keys()) {
				map.set(otherKey, value);
			}
		`,
		outdent`
			for (let key of map.keys()) {
				map.set(key, value);
			}
		`,
		outdent`
			for (let key of map.keys()) {
				key = otherKey;
				map.set(key, value);
			}
		`,
		outdent`
			for (let key of map.keys()) {
				key++;
				map.set(key, value);
			}
		`,
		outdent`
			for (const [key, value] of map) {
				map.delete(key);
				map.set(key, value);
			}
		`,
		outdent`
			for (const key of map.keys()) {
				map.delete(key);
				map.set(key, value);
			}
		`,
		outdent`
			for (const key of map['keys']()) {
				map.delete(key);
				map.set(key, value);
			}
		`,
		outdent`
			for (const [key, value] of map.entries()) {
				map.delete(key);
				map.set(key, value);
			}
		`,
		outdent`
			for (const [key, value] of map['entries']()) {
				map.delete(key);
				map.set(key, value);
			}
		`,
		outdent`
			for (const [key, value] of map) {
				switch (kind) {
					case 1:
						map.delete(key);
						map.set(key, value);
				}
			}
		`,
		outdent`
			for (const value of map.values()) {
				map.clear();
			}
		`,
		outdent`
			for (const value of map.values()) {
				map.delete(value);
			}
		`,
		outdent`
			for (const value of map.values()) {
				map.set(value, newValue);
			}
		`,
		outdent`
			for (const item of items) {
				for (const otherItem of otherItems) {
					items.push(otherItem);
				}
			}
		`,
		outdent`
			for (const item of items) {
				for (const otherItem of items) {
					items.push(otherItem);
				}
			}
		`,
		outdent`
			for (const value of set) {
				for (const innerValue of set) {
					set.delete(innerValue);
				}
			}
		`,
		outdent`
			for (const [key, value] of map) {
				for (const [innerKey] of map) {
					map.delete(innerKey);
				}
			}
		`,
		{
			code: outdent`
				for (const item of (items as string[])) {
					(items as string[]).push(item);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		// The current item is deleted in the `else` branch first
		outdent`
			for (const value of set) {
				if (condition) {
					foo();
				} else {
					set.delete(value);
				}

				set.add(value);
			}
		`,
	],
});

// A `break` only leaves the switch, the code after it still runs
test({
	valid: [],
	invalid: [
		{
			code: outdent`
				for (const value of set) {
					switch (kind) {
						case 'delete':
							set.delete(value);
							break;
					}

					set.add(value);
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				for (const value of set) {
					switch (kind) {
						case 'delete': {
							set.delete(value);
							break;
						}
					}

					set.add(value);
				}
			`,
			errors: 1,
		},
		// Falls through to a later `case` that breaks, so the code after the switch still runs
		{
			code: outdent`
				for (const value of set) {
					switch (kind) {
						case 'delete':
							set.delete(value);
						case 'other':
							break;
					}

					set.add(value);
				}
			`,
			errors: 1,
		},
		// The last `case` has no `break`, the switch is left and the code after it runs
		{
			code: outdent`
				for (const value of set) {
					switch (kind) {
						case 'delete':
							set.delete(value);
					}

					set.add(value);
				}
			`,
			errors: 1,
		},
	],
});

// A `case` that deletes and falls through into a loop exit never reaches the code after the switch
test({
	valid: [
		'for (const value of set) {\n\tswitch (kind) {\n\t\tcase \'delete\':\n\t\t\tset.delete(value);\n\t\t\tcontinue;\n\t}\n\tset.add(value);\n}',
		'for (const value of set) {\n\tswitch (kind) {\n\t\tcase \'delete\':\n\t\t\tset.delete(value);\n\t\tcase \'other\':\n\t\t\tcontinue;\n\t}\n\tset.add(value);\n}',
	],
	invalid: [],
});

// A whole `[key, value]` entry is never a key, so deleting by it removes nothing, also with `.entries()`
test({
	valid: [
		'const map = new Map(); for (const entry of map.entries()) { map.delete(entry); }',
		'const set = new Set(); for (const entry of set.entries()) { set.delete(entry); }',
		'const map = new Map(); for (const [key, value] of map) { map.delete(key); }',
	],
	invalid: [],
});

test({
	valid: [],
	invalid: [
		// A delete inside a `try` or a labeled statement can run before the re-insert, so the re-insert is still reported
		{
			code: 'const set = new Set([1]);\nfor (const x of set) {\n\ttry {\n\t\tset.delete(x);\n\t} catch {}\n\tset.add(x);\n}',
			errors: 1,
		},
		{
			code: 'const set = new Set([1]);\nfor (const x of set) {\n\tlabel: {\n\t\tset.delete(x);\n\t}\n\tset.add(x);\n}',
			errors: 1,
		},
		{
			code: 'const set = new Set([1]);\nfor (const x of set) {\n\ttry {\n\t\tfoo(x);\n\t} catch {\n\t\tset.delete(x);\n\t}\n\tset.add(x);\n}',
			errors: 1,
		},
		{
			code: 'const set = new Set([1]);\nfor (const x of set) {\n\ttry {\n\t\tfoo(x);\n\t} finally {\n\t\tset.delete(x);\n\t}\n\tset.add(x);\n}',
			errors: 1,
		},
		{
			code: 'const set = new Set([1]);\nfor (const x of set) {\n\ttry {\n\t\ttry {\n\t\t\tset.delete(x);\n\t\t} catch {}\n\t} catch {}\n\tset.add(x);\n}',
			errors: 1,
		},
		// A label without a block
		{
			code: 'const set = new Set([1]);\nfor (const x of set) {\n\tlabel: set.delete(x);\n\tset.add(x);\n}',
			errors: 1,
		},
		{
			code: 'const set = new Set([1]);\nfor (const x of set) {\n\touter: {\n\t\tinner: {\n\t\t\tset.delete(x);\n\t\t}\n\t}\n\tset.add(x);\n}',
			errors: 1,
		},
		// Only the `try` block jumps, the `catch` still deletes and runs into the re-insert
		{
			code: 'const set = new Set([1]);\nfor (const x of set) {\n\ttry {\n\t\tset.delete(x);\n\t\tcontinue;\n\t} catch {\n\t\tset.delete(x);\n\t}\n\tset.add(x);\n}',
			errors: 1,
		},
		// The re-insert is in a later nested block
		{
			code: 'const set = new Set([1]);\nfor (const x of set) {\n\ttry {\n\t\tset.delete(x);\n\t} catch {}\n\tif (condition) {\n\t\tset.add(x);\n\t}\n}',
			errors: 1,
		},
	],
});

test({
	valid: [
		// A delete followed by `continue` in a `catch` never reaches the re-insert
		'const set = new Set([1]);\nfor (const x of set) {\n\ttry {\n\t\tfoo(x);\n\t} catch {\n\t\tset.delete(x);\n\t\tcontinue;\n\t}\n\tset.add(x);\n}',
		'const set = new Set([1]);\nfor (const x of set) {\n\tlabel: {\n\t\tset.delete(x);\n\t\tcontinue;\n\t}\n\tset.add(x);\n}',
		// `throw` and an unlabeled `break` also skip the re-insert
		'const set = new Set([1]);\nfor (const x of set) {\n\ttry {\n\t\tfoo(x);\n\t} catch (error) {\n\t\tset.delete(x);\n\t\tthrow error;\n\t}\n\tset.add(x);\n}',
		'const set = new Set([1]);\nfor (const x of set) {\n\ttry {\n\t\tset.delete(x);\n\t\tbreak;\n\t} finally {\n\t\tfoo(x);\n\t}\n\tset.add(x);\n}',
		'function foo(set) {\n\tfor (const x of set) {\n\t\tlabel: {\n\t\t\tset.delete(x);\n\t\t\treturn;\n\t\t}\n\t\tset.add(x);\n\t}\n}',
		// A delete without a re-insert after it
		'const set = new Set([1]);\nfor (const x of set) {\n\ttry {\n\t\tset.delete(x);\n\t} catch {}\n}',
	],
	invalid: [],
});

test({
	valid: [
		// `break outer` to the loop's own label leaves the loop, so the re-insert never runs
		'const set = new Set([1]);\nouter: for (const x of set) {\n\ttry {\n\t\tset.delete(x);\n\t\tbreak outer;\n\t} catch {}\n\tset.add(x);\n}',
		// `break outer` to an enclosing loop also leaves this loop
		'const set = new Set([1]);\nouter: while (true) {\n\tfor (const x of set) {\n\t\tlabel: {\n\t\t\tset.delete(x);\n\t\t\tbreak outer;\n\t\t}\n\t\tset.add(x);\n\t}\n}',
		// A `break` that skips the re-insert in the same `switch` case, nested loop, or label
		'const set = new Set([1]);\nfor (const x of set) {\n\tswitch (key) {\n\t\tcase 1:\n\t\t\ttry {\n\t\t\t\tset.delete(x);\n\t\t\t\tbreak;\n\t\t\t} catch {}\n\t\t\tset.add(x);\n\t}\n}',
		'const set = new Set([1]);\nfor (const x of set) {\n\tfor (const y of other) {\n\t\ttry {\n\t\t\tset.delete(x);\n\t\t\tbreak;\n\t\t} catch {}\n\t\tset.add(x);\n\t}\n}',
		'const set = new Set([1]);\nfor (const x of set) {\n\tlabel: {\n\t\ttry {\n\t\t\tset.delete(x);\n\t\t\tbreak label;\n\t\t} catch {}\n\t\tset.add(x);\n\t}\n}',
		// Limitation: like an `if` branch, any `break` counts as a jump, even one that only leaves an inner `switch` or label before the re-insert
		'const set = new Set([1]);\nfor (const x of set) {\n\tswitch (key) {\n\t\tcase 1:\n\t\t\ttry {\n\t\t\t\tset.delete(x);\n\t\t\t} finally {\n\t\t\t\tbreak;\n\t\t\t}\n\t}\n\tset.add(x);\n}',
		'const set = new Set([1]);\nfor (const x of set) {\n\tlabel: {\n\t\tset.delete(x);\n\t\tbreak label;\n\t}\n\tset.add(x);\n}',
	],
	invalid: [],
});
