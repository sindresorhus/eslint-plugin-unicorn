import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['function f() {return(/* keep */ key) in object;}', 'function f() {return Object.hasOwn(object, (/* keep */ key));}'],
		['function f() {throw(/* keep */ key) in object;}', 'function f() {throw Object.hasOwn(object, (/* keep */ key));}'],
		['function* f() {yield(/* keep */ key) in object;}', 'function* f() {yield Object.hasOwn(object, (/* keep */ key));}'],
	].map(([code, output]) => ({
		code,
		errors: [{
			messageId: 'no-computed-property-existence-check/error',
			suggestions: [{messageId: 'no-computed-property-existence-check/suggestion', output}],
		}],
	})),
});

nodeTest('property existence suggestions preserve compact keyword behavior', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'no-computed-property-existence-check': rule}}},
		rules: {'unicorn/no-computed-property-existence-check': 'error'},
	};
	for (const code of [
		'function read() {return(/* keep */ key) in object;} read();',
		'function read() {throw(/* keep */ key) in object;} try { read(); } catch (error) { error; }',
		'function* read() {yield(/* keep */ key) in object;} read().next().value;',
	]) {
		const {fixed, output, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, false);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].suggestions.length, 1);
		const {fix} = messages[0].suggestions[0];
		const suggested = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		for (const source of [code, suggested]) {
			t.assert.strictEqual(runInNewContext(source, {key: 'value', object: {value: 1}}), true);
		}
	}
});

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test({
	valid: [],
	invalid: [
		['if (/* Keep this comment. */ object[key]) {}', 'if (/* Keep this comment. */ Object.hasOwn(object, key)) {}'],
		['if (/* Keep this comment. */ key in object) {}', 'if (/* Keep this comment. */ Object.hasOwn(object, key)) {}'],
		['if (\n// Keep this comment.\nobject[key]) {}', 'if (\n// Keep this comment.\nObject.hasOwn(object, key)) {}'],
		['if (\n// Keep this comment.\nkey in object) {}', 'if (\n// Keep this comment.\nObject.hasOwn(object, key)) {}'],
		['if ((/* keep */ object)[key]) {}', 'if (Object.hasOwn((/* keep */ object), key)) {}'],
		['if (object[(/* keep */ key)]) {}', 'if (Object.hasOwn(object, (/* keep */ key))) {}'],
		['if (key in (/* keep */ object)) {}', 'if (Object.hasOwn((/* keep */ object), key)) {}'],
		['if ((/* keep */ key) in object) {}', 'if (Object.hasOwn(object, (/* keep */ key))) {}'],
		['if (object[(key // keep\r\n)]) {}', 'if (Object.hasOwn(object, (key // keep\r\n))) {}'],
	].map(([code, output]) => ({
		code,
		errors: [{
			messageId: 'no-computed-property-existence-check/error',
			suggestions: [{messageId: 'no-computed-property-existence-check/suggestion', output}],
		}],
	})),
});

test({
	valid: [],
	invalid: [
		{
			code: 'if ((/* keep */ object as Record<string, unknown>)[key]) {}',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'no-computed-property-existence-check/error',
				suggestions: [{
					messageId: 'no-computed-property-existence-check/suggestion',
					output: 'if (Object.hasOwn((/* keep */ object as Record<string, unknown>), key)) {}',
				}],
			}],
		},
		...[
			'if ((/* keep */ object) /* do not lose */ [key]) {}',
			'if (object[(/* keep */ key) /* do not lose */]) {}',
			'if ((/* keep */ key) /* do not lose */ in object) {}',
		].map(code => ({
			code,
			errors: [{messageId: 'no-computed-property-existence-check/error', suggestions: []}],
		})),
	],
});

test.snapshot({
	valid: [
		'const value = object[key];',
		'const value = object?.[key];',
		'if (object[key] === true) {}',
		'if (object[key] !== undefined) {}',
		'if (object[key] == null) {}',
		'if (object["key"]) {}',
		'if (object[0]) {}',
		'if (object[-1]) {}',
		'if (object[+1]) {}',
		'if (object[-1n]) {}',
		'if (object[`key`]) {}',
		'if ("key" in object) {}',
		'if (0 in object) {}',
		'if (-1 in object) {}',
		'if (+1 in object) {}',
		'if (-1n in object) {}',
		'if (`key` in object) {}',
		'class Foo { #key; method(object) { if (#key in object) {} } }',
		'if (Object.hasOwn(object, key)) {}',
		'if (Object.prototype.hasOwnProperty.call(object, key)) {}',
		'if (map.has(key)) {}',
		'if (set.has(value)) {}',
		'const Boolean = value => value; if (Boolean(object[key])) {}',
		'function unicorn(Boolean) { if (Boolean(object[key])) {} }',
		{
			code: 'if (object["key" as const]) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if (("key" as const) in object) {}',
			languageOptions: {parser: parsers.typescript},
		},
		// A property whose value type is a known boolean is a value read, not an existence check (#3406).
		typeAware('declare const object: {a: boolean; b: boolean};\ndeclare const key: \'a\' | \'b\';\nif (object[key]) {}'),
		typeAware('declare const object: {a: boolean; b: boolean};\ndeclare const key: \'a\' | \'b\';\nif (!object[key]) {}'),
		// The exemption is driven by the value type, not the key type (compare the `Record<string, string>` invalid case below).
		typeAware('declare const object: Record<string, boolean>;\ndeclare const key: string;\nif (object[key]) {}'),
		// A literal boolean value type counts too.
		typeAware('declare const object: {a: true; b: false};\ndeclare const key: \'a\' | \'b\';\nif (object[key]) {}'),
	],
	invalid: [
		'if (object[key]) {}',
		'if (!object[key]) {}',
		'if (Boolean(object[key])) {}',
		'if (!!Boolean(object[key])) {}',
		'if (Boolean(object[key]) && ready) {}',
		'const value = object[key] ? first : second;',
		'while (object[key]) {}',
		'do {} while (object[key]);',
		'for (; object[key];) {}',
		'if (object[key] && other) {}',
		'if (other || object[key]) {}',
		'if ((object)[(key)]) {}',
		'if (object?.[key]) {}',
		'if (key in object) {}',
		'const exists = key in object;',
		'if (!(key in object)) {}',
		'if (key in object && other) {}',
		'const value = key in object ? first : second;',
		'while (key in object) {}',
		'do {} while (key in object);',
		'if ((key) in (object)) {}',
		'if (key in object?.property) {}',
		'if (getKey() in getObject()) {}',
		'if (object[key] in other) {}',
		'if (object[/* comment */ key]) {}',
		'if (/* comment */ key in object) {}',
		'if (key in /* comment */ object) {}',
		{
			code: 'if (object[key]!) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if ((object[key] as boolean)) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if ((object[key] as string)) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if ((<string>object[key])) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if ((object[key] satisfies boolean)) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if ((object[key] satisfies string)) {}',
			languageOptions: {parser: parsers.typescript},
		},
		// A non-boolean value is still an ambiguous existence check (#3406).
		typeAware('declare const object: Record<string, string>;\ndeclare const key: string;\nif (object[key]) {}'),
		// A possibly-`undefined` value is still ambiguous (#3406).
		typeAware('declare const object: {a?: boolean};\ndeclare const key: \'a\';\nif (object[key]) {}'),
		'if (object[first, second]) {}',
	],
});

// `map[key]` does not read a `Map` entry, and `string[index]` is a character read
test({
	valid: [
		'const cache = new Map();\nif (cache[key]) { use(); }',
		'const set = new Set();\nif (set[key]) { use(); }',
		'const weak = new WeakMap();\nif (weak[key]) { use(); }',
		'const name = \'abc\';\nif (name[index]) { use(); }',
		'if (\'abc\'[index]) { use(); }',
		// `key in map` is not a `Map#has()` either
		'const cache = new Map();\nif (key in cache) { use(); }',
		'const set = new Set();\nif (key in set) { use(); }',
		// `in` on a string always throws
		'const name = \'abc\';\nif (key in name) { use(); }',
		'if (key in \'abc\') { use(); }',
		'const set = new WeakSet();\nif (key in set) { use(); }',
		'const name = `abc`;\nif (name[index]) { use(); }',
		typeAware('declare const cache: Map<string, number>;\ndeclare const key: string;\nif (cache[key]) {}'),
		typeAware('declare const cache: ReadonlySet<string>;\ndeclare const key: string;\nif (key in cache) {}'),
		typeAware('declare const name: string;\ndeclare const index: number;\nif (name[index]) {}'),
	],
	invalid: [
		{
			code: 'if (object[key]) { use(); }',
			errors: 1,
		},
		{
			code: 'const object = {};\nif (object[key]) { use(); }',
			errors: 1,
		},
		{
			code: 'const object = new Foo();\nif (key in object) { use(); }',
			errors: 1,
		},
		{
			code: 'class A extends B { m() { if (super[key]) {} } }',
			errors: 1,
		},
		{
			...typeAware('declare class B {}\ndeclare const key: string;\nclass A extends B { m() { if (this[key]) {} if (super[key]) {} } }'),
			errors: 2,
		},
		{
			code: 'if (key in object) { use(); }',
			errors: 1,
		},
	],
});

// A `switch` discriminant is compared against the case values with `===`, so `object[key]` there is a value read, not an existence check
test({
	valid: [
		'switch (object[key]) {}',
		'switch (object[key]) {\n\tcase 1:\n\t\tuse();\n}',
	],
	invalid: [],
});

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			'/** @param {Map<string, number>} cache */ function run(cache, key) { if (cache[key]) {} }',
			'/** @param {WeakSet<object>} cache */ function run(cache, key) { if (key in cache) {} }',
			'/** @param {Set<string> | ReadonlySet<string>} cache */ function run(cache, key) { if (cache[key]) {} }',
			'/** @returns {string} */ function read() { return source; } if (read()[key]) {}',
			'/** @param {string} text */ function run(text, key) { const alias = text; if (key in alias) {} }',
			'/** @returns {ReadonlySet<string>} */ function read() { return source; } if (read()?.[key]) {}',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [
			{
				code: '/** @param {Object<string, boolean>} flags */ function run(flags, key) { if (flags[key]) {} }',
				errors: [{
					messageId: 'no-computed-property-existence-check/error', suggestions: [{
						messageId: 'no-computed-property-existence-check/suggestion',
						output: '/** @param {Object<string, boolean>} flags */ function run(flags, key) { if (Object.hasOwn(flags, key)) {} }',
					}],
				}],
			},
			{
				code: '/** @param {?Map<string, number>} cache */ function run(cache, key) { if (cache[key]) {} }',
				errors: [{
					messageId: 'no-computed-property-existence-check/error', suggestions: [{
						messageId: 'no-computed-property-existence-check/suggestion',
						output: '/** @param {?Map<string, number>} cache */ function run(cache, key) { if (Object.hasOwn(cache, key)) {} }',
					}],
				}],
			},
			{
				code: '/** @type {number} */ const text = "abc"; if (text[key]) {}',
				errors: [{
					messageId: 'no-computed-property-existence-check/error', suggestions: [{
						messageId: 'no-computed-property-existence-check/suggestion',
						output: '/** @type {number} */ const text = "abc"; if (Object.hasOwn(text, key)) {}',
					}],
				}],
			},
			{
				code: '/** @param {Object<string, boolean>} flags */ function run(flags, key) { if (flags[/* keep */ key]) {} }',
				errors: [{messageId: 'no-computed-property-existence-check/error', suggestions: 0}],
			},
		].map(testCase => ({...testCase, filename: 'file.ts'})),
	});
}

for (const parserOptions of [{}, {projectService: {allowDefaultProject: ['*.ts']}}]) {
	test({
		testerOptions: {languageOptions: {parser: typescriptEslintParser, parserOptions}},
		valid: [{code: '/** @param {unknown} cache */ function run(cache: Map<string, number>, key: string) { if (cache[key]) {} }', filename: 'file.ts'}],
		invalid: [{
			code: '/** @param {Map<string, number>} cache */ function run(cache: Record<string, unknown>, key: string) { if (cache[key]) {} }',
			filename: 'file.ts',
			errors: [{
				messageId: 'no-computed-property-existence-check/error', suggestions: [{
					messageId: 'no-computed-property-existence-check/suggestion',
					output: '/** @param {Map<string, number>} cache */ function run(cache: Record<string, unknown>, key: string) { if (Object.hasOwn(cache, key)) {} }',
				}],
			}],
		}],
	});
}
