import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta, 'no-immediate-mutation');

const checkConditionalsOptions = [{checkConditionals: true}];

// Consecutive declaration and initialization
ruleTest({
	valid: [
		'let foo = 1;',
		'let [foo] = string.split(\',\', 1);',
		'let [r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));',
		'let foo; let [r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));',
		'let foo; someOtherStatement(); foo = 1;',
		'let r; someOtherStatement(); let g, b; [r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));',
		'let foo; ; foo = 1;',
		'let foo; { foo = 1; }',
		'let foo; if (enabled) { foo = 1; }',
		{code: 'let foo; if (enabled) { foo = 1; }', options: checkConditionalsOptions},
		'let foo; enabled && (foo = 1);',
		'let foo; consume(foo = 1);',
		'let foo; foo += 1;',
		'let foo; foo ??= 1;',
		'let foo; other = 1;',
		'let foo; foo.bar = 1;',
		'let foo; [foo, other] = values;',
		'let foo; [foo, foo] = values;',
		'let foo; [] = values;',
		'let foo; [,] = values;',
		'let foo; ({foo} = object);',
		'let foo; [[foo]] = values;',
		'let foo; [foo = 1] = values;',
		'let foo; [...foo] = values;',
		'let foo; [foo.bar] = values;',
		'let foo; foo = foo ?? 1;',
		'let foo; foo = () => foo;',
		'let foo; [foo] = [foo];',
		'let foo, bar; [foo, bar] = [bar, foo];',
		'let foo, bar = 1; foo = 2;',
		'var foo; var foo; foo = 1;',
		'var foo; foo = 1; var foo;',
		'function run(foo) { var foo; foo = 1; }',
		'export let foo; foo = 1;',
		'for (let foo; enabled;) { foo = 1; }',
		{code: 'declare let foo; foo = 1;', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		{
			code: 'let foo;\nfoo = 1;',
			output: 'let foo = 1;',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo;\nfoo = {values: [bar, , () => 1]};',
			output: 'let foo = {values: [bar, , () => 1]};',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo;\nfoo = {method() { return value; }, get value() { return other; }};',
			output: 'let foo = {method() { return value; }, get value() { return other; }};',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo;\nfoo = {...source};',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo = {...source};'}],
			}],
		},
		{
			code: 'let foo;\n[foo] = [1];',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let [foo] = [1];'}],
			}],
		},
		{
			code: 'let foo;\n[foo] = string.split(\',\', 1);',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let [foo] = string.split(\',\', 1);'}],
			}],
		},
		{
			code: 'let r, g, b;\n[r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let [r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));'}],
			}],
		},
		{
			code: 'let r, g, b, foo;\n[r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo;\nlet [r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));'}],
			}],
		},
		{
			code: 'let foo;\nfoo = getValue();',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo = getValue();'}],
			}],
		},
		{
			code: 'async function run() {\n\tlet foo;\n\tfoo = await value;\n}',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'async function run() {\n\tlet foo = await value;\n}'}],
			}],
		},
		{
			code: 'function* run() {\n\tlet foo;\n\tfoo = yield value;\n}',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'function* run() {\n\tlet foo = yield value;\n}'}],
			}],
		},
		{
			code: 'let first, foo, last;\nfoo = last;',
			output: 'let first, last;\nlet foo = last;',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'var foo, other, other;\nfoo = 1;',
			output: 'var other, other;\nvar foo = 1;',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo;\nfoo = 1;\n// Keep this comment.\nconsume(foo);',
			output: 'let foo = 1;\n// Keep this comment.\nconsume(foo);',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'function run() {\r\n  let foo, other;\r\n  foo = 1;\r\n}',
			output: 'function run() {\r\n  let other;\r\n  let foo = 1;\r\n}',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'function run() {\r\n  let foo\r\n  foo = 1\r\n  consume(foo)\r\n}',
			output: 'function run() {\r\n  let foo = 1;\r\n  consume(foo)\r\n}',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo: number;\nfoo = 1;',
			languageOptions: {parser: parsers.typescript},
			output: 'let foo: number = 1;',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo;\nfoo = 1;\nfoo = "x";',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo = 1;\nfoo = "x";'}],
			}],
		},
		{
			code: 'var foo;\nfoo = 1;\nfoo = "x";',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'var foo = 1;\nfoo = "x";'}],
			}],
		},
		{
			code: 'let foo;\n[foo] = [1];\nfoo = "x";',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let [foo] = [1];\nfoo = "x";'}],
			}],
		},
		{
			code: 'let foo;\nfoo = 1;',
			filename: 'example.ts',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo = 1;'}],
			}],
		},
		{
			code: 'let foo: number | string;\nfoo = 1;\nfoo = "x";',
			languageOptions: {parser: parsers.typescript},
			output: 'let foo: number | string = 1;\nfoo = "x";',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
	],
});

ruleTest.snapshot({
	valid: [],
	invalid: [
		'var foo;\nfoo = 1;',
		'var r, g, b;\n[b, r, g] = values;',
		'let first, foo, last;\nfoo = 1;',
		'let r, keep, g, b;\n[g, , b, r] = values;',
		'let foo;\n((foo)) = ((1));',
		'let foo;\n((foo = (first, second)));',
		'let foo;\n[foo] = ((values));',
		'let foo;\nfoo = (other => other)(1);',
		'let foo;\nfoo = (foo => foo)(1);',
		'let foo;\nfoo = () => 1;',
		'let foo;\nfoo = other?.value;',
		'let foo;\nfoo = other?.getValue();',
		{code: 'let foo;\nfoo = <Component />;', languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
		'let foo;\nfoo = 1;\nfoo = 2;',
		'let foo\nfoo = 1\n;[1].map(callback)',
		'let foo;\nfoo = 1;\n[1].map(callback);',
		'function run() {\n\tlet foo;\n\tfoo = 1;\n}',
		'let foo;\nfoo = 1; // Keep this comment.',
		'let foo; // Keep this comment.\nfoo = 1;',
		'let /* Keep this comment. */ foo;\nfoo = 1;',
		'let foo;\n/* Keep this comment. */ foo = 1;',
		'let foo;\nfoo = /* Keep this comment. */ 1;',
		'let foo;\nfoo = getValue(/* Keep this comment. */);',
		{code: 'let foo;\nfoo = 1;', options: checkConditionalsOptions},
		{code: 'let foo: number;\nfoo = value as number;', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo: number, other: string;\nfoo = value!;', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo;\nfoo = value satisfies number;', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo: number, bar: string;\n[foo, bar] = values;', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo: number;\n[foo] = getValues();', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo;\n[foo] = values as number[];', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo!: number;\nfoo = 1;', languageOptions: {parser: parsers.typescript}},
	],
});

test('combines consecutive initialization and mutation across autofix passes', t => {
	const linter = new Linter();
	const code = 'let array;\narray = [1];\narray.push(2);\nif (enabled) { array.push(3); }';
	for (const [checkConditionals, output] of [
		[false, 'let array = [1, 2];\nif (enabled) { array.push(3); }'],
		[true, 'let array = [1, 2, ...((enabled) ? [3] : [])];'],
	]) {
		const result = linter.verifyAndFix(code, {
			plugins: {unicorn: plugin},
			rules: {'unicorn/no-immediate-mutation': ['error', {checkConditionals}]},
		});

		t.assert.strictEqual(result.fixed, true);
		t.assert.strictEqual(result.output, output);
		t.assert.deepStrictEqual(result.messages, []);
	}
});

test('does not autofix destructuring whose iterator reads an initialization target', t => {
	const linter = new Linter();
	const code = 'const values = { *[Symbol.iterator]() { yield foo; } };\nlet foo;\n[foo] = values;\nfoo;';
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn: plugin},
		rules: {'unicorn/no-immediate-mutation': 'error'},
	});

	t.assert.strictEqual(runInNewContext(code), undefined);
	t.assert.strictEqual(runInNewContext(result.output), undefined);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].messageId, 'initialization');
	t.assert.strictEqual(result.messages[0].suggestions.length, 1);
});

test('does not autofix initialization whose implicit calls read an initialization target', t => {
	const linter = new Linter();
	for (const {setup, initializer, read = 'foo', expected} of [
		{
			setup: 'const value = { valueOf() { return foo === undefined ? 2 : 3; } };',
			initializer: '+value',
			expected: 2,
		},
		{
			setup: 'const value = { valueOf() { return foo === undefined ? 2 : 3; } };',
			initializer: 'value ** 2',
			expected: 4,
		},
		{
			setup: 'function tag() { return foo; }',
			initializer: 'tag`text`',
			expected: undefined,
		},
		{
			setup: 'const value = { toString() { return foo === undefined ? "key" : "other"; } };',
			initializer: '`${value}`', // eslint-disable-line no-template-curly-in-string
			expected: 'key',
		},
		{
			setup: 'const value = { toString() { return foo === undefined ? "key" : "other"; } };',
			initializer: '{[value]: 1}',
			read: 'foo.key',
			expected: 1,
		},
		{
			setup: 'const values = { *[Symbol.iterator]() { yield foo; } };',
			initializer: '{values: [...values]}',
			read: 'foo.values.length',
			expected: 1,
		},
		{
			setup: 'const Constructor = { [Symbol.hasInstance]() { return foo === undefined; } };',
			initializer: '{} instanceof Constructor',
			expected: true,
		},
	]) {
		const code = `${setup}\nlet foo;\nfoo = ${initializer};\n${read};`;
		const result = linter.verifyAndFix(code, {
			plugins: {unicorn: plugin},
			rules: {'unicorn/no-immediate-mutation': 'error'},
		});

		t.assert.strictEqual(runInNewContext(code), expected, initializer);
		t.assert.strictEqual(runInNewContext(result.output), expected, initializer);
		t.assert.strictEqual(result.fixed, false, initializer);
		t.assert.strictEqual(result.output, code, initializer);
		t.assert.strictEqual(result.messages.length, 1, initializer);
		t.assert.strictEqual(result.messages[0].messageId, 'initialization', initializer);
		t.assert.strictEqual(result.messages[0].suggestions.length, 1, initializer);
	}
});
