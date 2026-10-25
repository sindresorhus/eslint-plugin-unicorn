import test from 'node:test';
import {Linter} from 'eslint';
import outdent from 'outdent';
import unicorn from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: testRule} = getTester(import.meta);

testRule.typescript({
	valid: [
		...[
			'type Value = number; function foo() { return 1 as Value; }',
			'function foo() { type Value = number; if (condition) { consume(1 as Value); } }',
		].map(code => ({code, options: [{checkTypeAliases: false}]})),
		'type Box<in out Type> = {readonly value: Type}; export function make<Type>() { return {} as Box<Type>; }',
		'type Consumer<in Type> = (value: Type) => void; function make() { return {} as Consumer<string>; }',
		'type Producer<out Type> = () => Type; function make() { return {} as Producer<string>; }',
	],
	invalid: [
		...[{}, {checkTypeAliases: true}].map(options => ({
			code: 'type Value = number;\nfunction foo() { return 1 as Value; }',
			options: [options],
			output: 'function foo() { type Value = number; return 1 as Value; }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Value'}}],
		})),
		{
			code: 'type Value = number; function foo() { let value; if (condition) { value = compute(); consume(value as Value); } }',
			options: [{checkTypeAliases: false}],
			output: 'type Value = number; function foo() {  if (condition) { const value = compute(); consume(value as Value); } }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'value'}}],
		},
		{
			code: 'type Value = number; function foo() { const value = 1; if (condition) { consume(value as Value); } }',
			options: [{checkTypeAliases: false}],
			output: 'type Value = number; function foo() { if (condition) { const value = 1; consume(value as Value); } }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'value'}}],
		},
		{
			code: 'type Value = number; function foo() { let value: Value; if (condition) { value = compute(); consume(value); } }',
			options: [{checkTypeAliases: false}],
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'value'}}],
		},
		{
			code: 'type Value = number;\nfunction render() { return <Component<Value> />; }',
			output: 'function render() { type Value = number; return <Component<Value> />; }',
			filename: 'file.tsx',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Value'}}],
		},
		...['async function foo()', 'function* foo()'].map(signature => ({
			code: `type Value<Type> = Type;\n${signature} { return 1 as Value<number>; }`,
			output: `${signature} { type Value<Type> = Type; return 1 as Value<number>; }`,
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Value'}}],
		})),
		{
			code: outdent`
				type Range = {start: number; end: number};
				function overlaps(a: [number, number], b: [number, number]) {
					const first: Range = {start: a[0], end: a[1]};
					const second: Range = {start: b[0], end: b[1]};
					return first.start < second.end && second.start < first.end;
				}
			`,
			output: outdent`
				function overlaps(a: [number, number], b: [number, number]) {
					type Range = {start: number; end: number};
					const first: Range = {start: a[0], end: a[1]};
					const second: Range = {start: b[0], end: b[1]};
					return first.start < second.end && second.start < first.end;
				}
			`,
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Range'}}],
		},
		{
			code: outdent`
				type Entry = {key: string; value: unknown};
				function parseEntries(json: string | undefined) {
					if (json) {
						const entries: Entry[] = JSON.parse(json);
						return entries.filter((entry): entry is Entry & {value: number} => typeof entry.value === 'number');
					}
					return [];
				}
			`,
			output: outdent`
				function parseEntries(json: string | undefined) {
					if (json) {
						type Entry = {key: string; value: unknown};
						const entries: Entry[] = JSON.parse(json);
						return entries.filter((entry): entry is Entry & {value: number} => typeof entry.value === 'number');
					}
					return [];
				}
			`,
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Entry'}}],
		},
		{
			code: 'type Value = {\r\n  value: number;\r\n};\r\nfunction foo() {\r\n  return {} as Value;\r\n}',
			output: 'function foo() {\r\n  type Value = {\r\n    value: number;\r\n  };\r\n  return {} as Value;\r\n}',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Value'}}],
		},
		{
			code: 'class A { a = 1; method() { type Self = this; class B { b = 2; method() { return ({} as Self).a; } } return B; } }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Self'}}],
		},
		{
			code: 'class A { a = 1; method() { type Self = typeof this; class B { b = 2; method() { return ({} as Self).a; } } return B; } }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Self'}}],
		},
		{
			code: 'type Item = number; type Box<Type = Item> = {value: Type}; function foo<Item>() { return {} as Box; }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Box'}}],
		},
		{
			code: 'type await = number; async function foo() { return 1 as await; }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'await'}}],
		},
		{
			code: 'type Value<await> = await; async function foo() { return 1 as Value<number>; }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Value'}}],
		},
		{
			code: 'type Value<yield> = yield; function* foo() { return 1 as Value<number>; }',
			languageOptions: {sourceType: 'script'},
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Value'}}],
		},
		{
			code: 'type Value<implements> = implements; class Foo { method() { return 1 as Value<number>; } }',
			languageOptions: {sourceType: 'script'},
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Value'}}],
		},
		{
			code: 'type implements = number; type Value = implements; class Foo { method() { return 1 as Value; } }',
			languageOptions: {sourceType: 'script'},
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Value'}}],
		},
		{
			code: 'type Tree = {children?: Tree[]}; export function make() { return {} as Tree; }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Tree'}}],
		},
		{
			code: 'let key: "a" | "b" = "a"; type Shape = {[key]: number}; function make() { const name: "a" = {} as keyof Shape; return name; }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Shape'}}],
		},
		{
			code: 'function decorate(...arguments_: any[]) {} type Alias = Date; const Alias = Date; function make() { class Value { @decorate value!: Alias; } return Value; }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Alias'}}],
		},
		{
			code: 'function decorate(...arguments_: any[]) {}\ntype Alias = Date;\nfunction make() { class Value { @decorate value!: Alias; } return Value; }',
			output: 'function decorate(...arguments_: any[]) {}\nfunction make() { type Alias = Date; class Value { @decorate value!: Alias; } return Value; }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Alias'}}],
		},
		{
			code: 'const Value = "runtime"; type Value = number; function foo() { return 1 as Value; }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Value'}}],
		},
		{
			code: 'type Value = number; const Value = "runtime"; consume(Value); function foo() { return 1 as Value; }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Value'}}],
		},
		{
			code: 'type Value = number; export const Value = "runtime"; function foo() { return 1 as Value; }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Value'}}],
		},
		{
			code: 'consume()\ntype Value = number;\n[1].map(value => { return value as Value; });',
			output: 'consume()\n;\n[1].map(value => { type Value = number; return value as Value; });',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Value'}}],
		},
	],
});

testRule.vue({
	testerOptions: {languageOptions: {parserOptions: {parser: parsers.typescript.implementation}}},
	valid: [
		'<script setup lang="ts">type Value = number; function foo() { return 1 as Value; }</script><template>{{ 1 as Value }}</template>',
		{
			code: '<script setup lang="ts">/** Shared value. */ type Box<Type> = {value: Type}; function foo() { return {} as Box<number>; }</script>',
			options: [{checkTypeAliases: false}],
		},
	],
	invalid: [
		{
			code: '<script setup lang="ts">/** Shared value. */ type Box<Type> = {value: Type}; function foo() { return {} as Box<number>; }</script>',
			options: [{checkTypeAliases: true}],
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Box'}}],
		},
	],
});

testRule.svelte({
	testerOptions: {languageOptions: {parserOptions: {parser: parsers.typescript.implementation}}},
	valid: [
		'<script lang="ts">type Value = number; function foo() { return 1 as Value; }</script>{1 as Value}',
		'<script lang="ts" generics="Type extends Value">type Value = number; function foo() { return 1 as Value; }</script>',
		'<script module lang="ts">type Value = number; function foo() { return 1 as Value; } export type {Value as Shared};</script>',
	],
	invalid: [
		{
			code: outdent`
				<script lang="ts">
				type Value = number;
				function foo() { return 1 as Value; }
				</script>
			`,
			output: outdent`
				<script lang="ts">
				function foo() { type Value = number; return 1 as Value; }
				</script>
			`,
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Value'}}],
		},
		{
			code: outdent`
				<script module lang="ts">
				type Value = number;
				</script>
				<script lang="ts">
				function foo() { return 1 as Value; }
				</script>
			`,
			output: outdent`
				<script module lang="ts">
				</script>
				<script lang="ts">
				function foo() { type Value = number; return 1 as Value; }
				</script>
			`,
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'Value'}}],
		},
	],
});

testRule.snapshot({
	testerOptions: {languageOptions: {parser: parsers.typescript}},
	valid: [
		'export type Value = number; function foo() { return 1 as Value; }',
		...[
			'export type {Value};',
			'export {type Value};',
			'export type {Value as Shared};',
			'export default Value;',
			'export = Value;',
		].map(exportStatement => `type Value = number; function foo() { return 1 as Value; } ${exportStatement}`),
		'type Unused = number; function foo() {}',
		'type Unused = {next: Unused}; function foo() {}',
		'declare type Value = number; function foo() { return 1 as Value; }',
		'function foo() { type Value = number; return 1 as Value; }',
		'type Value = number; function foo(value: Value) { return value; }',
		'type Value = number; function foo(value = 1 as Value) { return value; }',
		'type Value = number; function foo(): Value { return 1 as Value; }',
		'type Value = number; function foo<Type extends Value>() { return 1 as Value; }',
		'type Value = number; const foo = (value: Value) => value;',
		'type Value = number; const foo = (): Value => { return 1 as Value; };',
		'type Value = number; const foo = () => 1 as Value;',
		'type Value = number; function foo() { return 1 as Value; } function bar() { return 2 as Value; }',
		'type Value = number; if (condition) { consume(1 as Value); } else { consume(2 as Value); }',
		'type Value = number; for (const value of [] as Value[]) { consume(value); }',
		'type Value = number; if (1 as Value) { consume(2 as Value); }',
		'type Value = number; if (condition) consume(1 as Value);',
		'type Value = number; class Foo { value: Value; }',
		'type Value = number; class Foo { static { consume(1 as Value); } }',
		'type First = {next?: Second}; type Second = {next?: First}; function foo() { return {} as First; }',
		'type Value = number; const Value = "runtime"; function foo() { return 1 as Value; } export default Value;',
		'interface Value {value: number} function foo() { return {} as Value; }',
		'namespace Foo { type Value = number; function foo() { return 1 as Value; } }',
		'switch (condition) { case 1: type Value = number; if (condition) { consume(1 as Value); } }',
	],
	invalid: [
		'type Value = number; const foo = () => { return 1 as Value; };',
		'type Value = number; const foo = function () { return 1 as Value; };',
		'type Value = number; values.map(value => { return value as Value; });',
		'type Value = number; while (condition) { consume(1 as Value); }',
		'type Value = number; for (const value of values) { consume(value as Value); }',
		'type Value = number; try { consume(1 as Value); } catch {}',
		'type Value = number; try {} catch (error) { consume(error as Value); }',
		'type Value = number; { consume(1 as Value); }',
		'type Value = number; function foo() { if (condition) { consume(1 as Value); } consume(2 as Value); }',
		'type Value = number; function foo() { if (condition) { consume(1 as Value); } else { consume(2 as Value); } }',
		'type Value = number; if (condition) { function foo(value: Value) { return value; } function bar(value: Value) { return value; } }',
		'type Value = number; function foo() { const bar = (value: Value): Value => value; }',
		'type Value = {next?: Value}; function foo() { return {} as Value; }',
		'type Box<Type> = {value: Type}; function foo<Type>() { return {} as Box<Type>; }',
		'type Keys<Type> = {[Key in keyof Type]: Key}; function foo<Key>() { return {} as Keys<Key>; }',
		'type Result<Type> = Type extends Promise<infer Value> ? Value : never; function foo<Value>() { return {} as Result<Value>; }',
		'import type {Item} from "./module.js"; type Pair = [Item, Item]; function foo() { return [] as Pair; }',
		'type Value = number; class Foo { method() { return 1 as Value; } }',
		'function foo() { return 1 as Value; }\ntype Value = number;',
		'type Value = number; function foo() { "use strict"; return 1 as Value; }',
		'type Value = number; function foo() { "use strict"; "other directive"; return 1 as Value; }',
		'type Value = number\nfunction foo() {\n  "use strict"\n  return 1 as Value\n}',
		'type Value = number\nfunction foo() {\n  return (1 as Value)\n}',
		'type Value = {\n  value: number;\n};\nfunction foo() {\n  return {} as Value;\n}',
		'function outer() {\n  type Value = {\n    value: number;\n  };\n  function foo() {\n    return {} as Value;\n  }\n}',
		'type Value = number; function foo() {return 1 as Value;}',
		'type Value = number; function foo() { return (<Value>1)!; }',
		'type Value = number; function foo() { return (1 as Value) satisfies Value; }',
		'consume()\ntype Value = number\n{\n\tconsume(1 as Value)\n}',
		// Keep reporting when a fix would change type resolution.
		'type Item = {id: string}; type Pair = [Item, Item]; function makePair<Item>(value: Item) { const pair: Pair = [{id: "a"}, {id: "b"}]; return [value, pair]; }',
		'type Pair = [Item, Item]; function foo() { type Item = number; return [] as Pair; }',
		'type Value = number; function foo() { const Value = 1; return Value as Value; }',
		'let value: string | number = 1; type Value = typeof value; function foo() { return 1 as Value; }',
		'type Value = {value: typeof item}; function foo() { return {} as Value; }',
		// Keep comments at their original locations.
		'/* declaration */ type Value = number; function foo() { return 1 as Value; }',
		'type Value = /* value */ number; function foo() { return 1 as Value; }',
		'type Value = number; /* following */ function foo() { return 1 as Value; }',
		'type Value = number; function foo() { /* use */ return 1 as Value; }',
		// Reindenting a multiline literal type would change its meaning.
		'type Value = `first\nsecond`; function foo() { return "first\\nsecond" as Value; }',
		'type Value = "first\\\nsecond"; function foo() { return "firstsecond" as Value; }',
		'type Callback = <Type>(value: Type) => Type; function foo<Type>() { return {} as Callback; }',
		'interface Base {value: number} type Recursive<Type extends Base> = {value: Type; next?: Recursive<Type>}; function foo() { return {} as Recursive<Base>; }',
		'type Value = number; function foo(callback = () => { return 1 as Value; }) { return callback(); }',
	],
});

test('independent type aliases with overlapping fixes reach a stable smallest scope', t => {
	const linter = new Linter();
	const config = {
		languageOptions: {parser: parsers.typescript.implementation},
		plugins: {unicorn},
		rules: {'unicorn/prefer-smaller-scope': 'error'},
	};
	const code = 'type First = number;\ntype Second = string;\nfunction foo() { return [1 as First, "a" as Second]; }';
	t.assert.strictEqual(linter.verify(code, config).length, 2);
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(result.output, 'function foo() { type Second = string; type First = number; return [1 as First, "a" as Second]; }');
	const secondResult = linter.verifyAndFix(result.output, config);
	t.assert.strictEqual(secondResult.fixed, false);
	t.assert.deepStrictEqual(secondResult.messages, []);
	t.assert.strictEqual(secondResult.output, result.output);
});

test('dependent type aliases reach a stable smallest scope', t => {
	const linter = new Linter();
	const config = {
		languageOptions: {parser: parsers.typescript.implementation},
		plugins: {unicorn},
		rules: {'unicorn/prefer-smaller-scope': 'error'},
	};
	const code = outdent`
		type Item = {id: string};
		type Pair = [Item, Item];
		function foo() {
			if (condition) {
				return [] as Pair;
			}
		}
	`;
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(result.output, outdent`
		function foo() {
			if (condition) {
				type Item = {id: string};
				type Pair = [Item, Item];
				return [] as Pair;
			}
		}
	`);
	const secondResult = linter.verifyAndFix(result.output, config);
	t.assert.strictEqual(secondResult.fixed, false);
	t.assert.deepStrictEqual(secondResult.messages, []);
	t.assert.strictEqual(secondResult.output, result.output);
});

testRule({
	valid: [],
	invalid: [
		{
			code: 'function foo(bar) { const result = 1; if (bar) { console.log(result); } }',
			output: 'function foo(bar) { if (bar) { const result = 1; console.log(result); } }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'result'}}],
		},
		{
			code: 'const value = 1; if (condition) { consume(/* keep */ value); }',
			output: 'if (condition) { const value = 1; consume(/* keep */ value); }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'value'}}],
		},
		{
			code: 'const value = 1; if (condition) { consume(value); // Keep this comment.\n}',
			output: 'if (condition) { const value = 1; consume(value); // Keep this comment.\n}',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'value'}}],
		},
	],
});

testRule.snapshot({
	valid: [
		'const value = 1; if (condition) { consume(); }',
		'const value = 1; if (value) { consume(value); }',
		'const value = 1; if (condition) { consume(value); } consume(value);',
		'const value = 1; if (condition) { consume(value); } export {value};',
		'let value = 1; if (condition) { consume(value); } value = 2;',
		'const value = 1; if (condition) { consume(value); } else { consume(value); }',
		'const value = 1; consume(); if (condition) { consume(value); }',
		'const value = 1; if (condition) consume(value);',
		'const value = 1; if (condition) {} else if (other) { consume(value); }',
		'const value = 1; while (condition) { consume(value); }',
		'switch (condition) { case 0: const value = 1; if (other) { consume(value); } }',
		'const value = 1; if (condition) { function nested() { consume(value); } nested(); }',
		'const value = 1; if (condition) { consume(function () { return value; }); }',
		'const value = 1; if (condition) { consume(() => value); }',
		'const value = 1; if (condition) { class Nested { field = value; } consume(Nested); }',
		'const value = 1; if (condition) { consume(class { field = value; }); }',
		'const value = 1; if (condition) { eval("value"); consume(value); }',
		'const value = 1; if (condition) { consume(value); } eval("value");',
		'const value = 1, other = 2; if (condition) { consume(value, other); }',
		'const [value] = "a"; if (condition) { consume(value); }',
		'var value = 1; if (condition) { consume(value); }',
		'using value = null; if (condition) { consume(value); }',
		...[
			'getValue()',
			'other',
			'/pattern/',
			'[1]',
			'{foo: 1}',
			'`value ${other}`', // eslint-disable-line no-template-curly-in-string
			'tag`value`',
			'-1',
			'await getValue()',
		].map(initializer => `async function foo() { const value = ${initializer}; if (condition) { consume(value); } }`),
		...[
			'1 as number',
			'1 satisfies number',
		].map(initializer => ({
			code: `const value = ${initializer}; if (condition) { consume(value); }`,
			languageOptions: {parser: parsers.typescript},
		})),
		{
			code: 'const value = 1; if (condition) { consume(value); } type Value = typeof value;',
			languageOptions: {parser: parsers.typescript},
		},
		...[
			'export type {value};',
			'export {type value};',
			'export type {value as Value};',
		].map(exportStatement => ({
			code: `const value = 1; if (condition) { consume(value); } ${exportStatement}`,
			languageOptions: {parser: parsers.typescript},
		})),
		{
			code: 'let value; if (condition) { value = getValue(); consume(value); } export type {value};',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Value = typeof value; const value = 1; if (condition) { consume(value); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'declare const value = 1; if (condition) { consume(value); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'declare let value; if (condition) { value = getValue(); consume(value); }',
			languageOptions: {parser: parsers.typescript},
		},
		...[
			'eval!("consume(value)");',
			'(eval as any)("consume(value)");',
			'((eval as <Type>(source: string) => Type)<number>)("consume(value)");',
		].map(evalCall => ({
			code: `const value = 1; if (condition) { consume(value); } ${evalCall}`,
			languageOptions: {parser: parsers.typescript},
		})),
		{
			code: 'function foo(object) { const value = 1; if (condition) { with (object) { consume(value); } } }',
			languageOptions: {sourceType: 'script'},
		},
		...[
			'/* exported value */ const value = 1; if (condition) { consume(value); }',
			'/* exported value */ let value; if (condition) { value = getValue(); consume(value); }',
		].map(code => ({
			code,
			languageOptions: {sourceType: 'script'},
		})),
		// An uninitialized `const` is invalid code, but the TypeScript parser accepts it
		{
			code: 'const value: number; if (condition) { value = 1; consume(value); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		...['1', '1n', 'true', 'false', 'null', '"value"', '`value`'].map(initializer => `const value = ${initializer}; if (condition) { consume(value); }`),
		'let value = 1; if (condition) { value++; consume(value); }',
		'let value = 1; if (condition) { ({value} = object); }',
		'const value = 1; if (condition) { consume(); } else { consume(value); }',
		'const value = 1; if (condition) { consume(value); } else { const value = 2; consume(value); }',
		'const value = 1; if (condition) { if (other) { consume(value); } }',
		'const value = (1); if (condition) { consume(value); }',
		{
			code: 'const value = 1; if (condition) { returnValue = <Component value={value} />; }',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		'const value = 1; if (condition) { consume?.(value); }',
		'const value = 1\nif (condition) {\n\t[value].map(consume)\n}',
		'const value = `first\nsecond`; if (condition) { consume(value); }',
		'const value = 1; if (condition) { "use strict"; consume(value); }',
		'/* declaration */ const value = 1; if (condition) { consume(value); }',
		'const value = /* initializer */ 1; if (condition) { consume(value); }',
		'const value = 1; /* condition */ if (condition) { consume(value); }',
		'const value = 1; if (condition) { /* first statement */ consume(value); }',
		{
			code: 'const value: number = 1; if (condition) { consume(value); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Value = number; const value: Value = 1; if (condition) { type Value = string; consume(value); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const value = 1; if (condition) { type Value = typeof value; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Other = string; const value = 1; if (condition) { consume(value); } export type {Other};',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const value = 1; if (condition) { consume(value); } export type {value} from "./module.js";',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '/* exported exportedValue */ const exportedValue = 1; const value = 1; if (condition) { consume(value); }',
			languageOptions: {sourceType: 'script'},
		},
		// No whitespace after the opening brace
		'const value = 1; if (condition) {consume(value);}',
		// Optional `eval` calls are indirect, so they cannot read `value` in a module
		'const value = 1; if (condition) { consume(value); } eval?.("consume(value)");',
	],
});

test('literal declarations work with no-declarations-before-early-exit', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn},
		rules: {
			'unicorn/prefer-smaller-scope': 'error',
			'unicorn/no-declarations-before-early-exit': 'error',
		},
	};
	const code = outdent`
		function foo(bar, condition) {
			const result = 1;
			if (!bar) {
				return;
			}
			if (condition) {
				console.log(result);
			}
		}
	`;
	const result = linter.verifyAndFix(code, config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(result.output, outdent`
		function foo(bar, condition) {
			if (!bar) {
				return;
			}
			if (condition) {
				const result = 1;
				console.log(result);
			}
		}
	`);
});

testRule.snapshot({
	valid: [
		outdent`
			function foo() {
				while (condition) {
					const value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				while (condition) {
					value = getValue(value);
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				while (condition) {
					console.log(value);
					value = getValue();
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				while (condition) {
					value = getValue();
				}
				console.log(value);
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = getValue();
					console.log(value);
				}
				if (otherCondition) {
					value = getOtherValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value = getValue();
				if (condition) {
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				const value = getValue();
				if (condition) {
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				var value;
				if (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value, otherValue;
				if (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value += getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					({value} = getObject());
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					[value] = getArray();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value++;
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					++value;
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (value = getValue()) {
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				for (value = getValue(); condition; update()) {
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				switch (condition) {
					case true:
						value = getValue();
						console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					value = getValue();
					console.log(value);
				}
				let value;
			}
		`,
		outdent`
			let value;
			function foo() {
				value = getValue();
				console.log(value);
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					function bar() {
						value = getValue();
						console.log(value);
					}
					bar();
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					class Bar {
						method() {
							value = getValue();
							console.log(value);
						}
					}
					console.log(Bar);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = getValue();
					function bar() {
						console.log(value);
					}
					bar();
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = getValue();
					class Bar {
						method() {
							console.log(value);
						}
					}
					console.log(Bar);
				}
			}
		`,
		{
			code: outdent`
				function foo(object) {
					let value;
					with (object) {
						value = getValue();
						console.log(value);
					}
				}
			`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = getValue();
					eval('value = getOtherValue()');
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = getValue();
					console.log(value);
				}
				eval('console.log(value)');
			}
		`,
		outdent`
			function foo() {
				let value;
				function bar() {
					eval('console.log(value)');
				}
				if (condition) {
					value = getValue();
					console.log(value);
				}
				bar();
			}
		`,
		{
			code: outdent`
				function foo(object) {
					let value;
					with (object) {
						call();
					}
					if (condition) {
						value = getValue();
						console.log(value);
					}
				}
			`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: outdent`
				function foo(object) {
					let value;
					with (object) {
						eval('console.log(value)');
					}
					if (condition) {
						value = getValue();
						console.log(value);
					}
				}
			`,
			languageOptions: {
				sourceType: 'script',
			},
		},
	],
	invalid: [
		outdent`
			let value;
			{
				value = getValue();
				console.log(value);
			}
		`,
		outdent`
			function foo() {
				let value;
				while (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				{
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				for (const item of items) {
					value = item.value;
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				switch (condition) {
					case true: {
						value = getValue();
						console.log(value);
						break;
					}
				}
			}
		`,
		outdent`
			function foo() {
				// Important setup.
				let value;
				if (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				// Keep this close to the assignment.
				if (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = getValue(); // Keep this comment.
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					(value = getValue());
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					(value = (foo, bar));
					console.log(value);
				}
			}
		`,
		{
			code: outdent`
				function foo() {
					let value: Value;
					if (condition) {
						value = getValue();
						console.log(value);
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				function foo() {
					let value: Value;
					if (condition) {
						(value = getValue());
						console.log(value);
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				type Value = string;
				function foo() {
					let value: Value;
					if (condition) {
						value = getValue();
						type Value = number;
						console.log(value);
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		// The parentheses around the assigned value must survive the fix
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = (getValue());
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = (first, second);
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					(value = ({foo: 1}));
					console.log(value);
				}
			}
		`,
	],
});
