import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import plugin from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';
import {DEFAULT_LANGUAGE_OPTIONS} from './utils/language-options.js';

const {test: ruleTest, rule} = getTester(import.meta);

const typescript = code => ({
	code,
	languageOptions: {parser: typescriptEslintParser},
});

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

// `for...of`
ruleTest.snapshot({
	valid: [
		outdent`
			const result = [existing];
			for (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			foo();
			for (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [], other = [];
			for (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			var result = [];
			for (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			using result = [];
			for (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			async function foo() {
				await using result = [];
				for (const element of iterable) {
					result.push(element);
				}
			}
		`,
		outdent`
			const result = [];
			if (condition) for (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for (const element of iterable) {
				result.push(element);
				foo();
			}
		`,
		outdent`
			async function foo() {
				const result = [];
				for await (const element of iterable) {
					result.push(element);
				}
			}
		`,
		outdent`
			const result = [];
			for (const element of iterable) {
				result.push(element, other);
			}
		`,
		outdent`
			const result = [];
			for (const element of iterable) {
				result.push(element.value);
			}
		`,
		outdent`
			const result = [];
			for (const element of iterable) {
				other.push(element);
			}
		`,
		outdent`
			const result = [];
			for (const result of iterable) {
				result.push(result);
			}
		`,
		outdent`
			const result = [];
			for (var element of iterable) {
				result.push(element);
			}
			console.log(element);
		`,
		outdent`
			const result = [];
			for (using element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			async function foo() {
				const result = [];
				for await (await using element of iterable) {
					result.push(element);
				}
			}
		`,
		outdent`
			const result = [];
			for (const element of getValues(result)) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for (const [key, value] of map.entries()) {
				result[key] = value;
			}
		`,
		outdent`
			const array = new Map([['key', 'value']]);
			const result = [];
			for (const [index, element] of array.entries()) {
				result[index] = element;
			}
		`,
		outdent`
			const result = [];
			for (const [index, element] of array.entries()) {
				result[index] = element;
			}
		`,
		outdent`
			const result = [];
			for (const [index, element] of iterable.entries()) {
				result[otherIndex] = element;
			}
		`,
		outdent`
			const result = [];
			for (const [index, element] of iterable.entries()) {
				result[index] = other;
			}
		`,
		outdent`
			const result = [];
			for (const [index, element] of iterable.entries()) {
				other[index] = element;
			}
		`,
	],
	invalid: [
		outdent`
			const result = [];
			for (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for (const element of iterable)
				result.push(element);
		`,
		outdent`
			let result = [];
			for (const element of object.items) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for (const element of (iterable)) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for (const element of (/* Keep this comment. */ iterable)) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for (const [index, element] of [foo, bar].entries()) {
				result[index] = element;
			}
		`,
		typeAware(outdent`
			function foo(array: string[]) {
				const result = [];
				for (const [index, element] of array.entries()) {
					result[index] = element;
				}
			}
		`),
		typeAware(outdent`
			function foo(values: string[]) {
				const result: string[] = [];
				for (const element of values) {
					result.push(element);
				}
			}
		`),
		outdent`
			const result = [/* Keep this comment. */];
			for (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			// Keep this comment.
			for (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for (const element of iterable) {
				// Keep this comment.
				result.push(element);
			}
		`,
	],
});

// `Array.from`
ruleTest.snapshot({
	valid: [
		'[...set].map(() => {});',
		// TypedArray.from
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/from
		'Int8Array.from(set);',
		'Uint8Array.from(set);',
		'Uint8ClampedArray.from(set);',
		'Int16Array.from(set);',
		'Uint16Array.from(set);',
		'Int32Array.from(set);',
		'Uint32Array.from(set);',
		'Float16Array.from(set);',
		'Float32Array.from(set);',
		'Float64Array.from(set);',
		'BigInt64Array.from(set);',
		'BigUint64Array.from(set);',

		// Not `CallExpression`
		'new Array.from(foo);',
		// `Array.from` on a member expression (e.g. `globalThis.Array`) is not flagged
		'globalThis.Array.from(set);',
		// Not `MemberExpression`
		'from(foo);',
		// `callee.property` is not a `Identifier`
		'Array["from"](foo);',
		// Computed
		'Array[from](foo);',
		// Not `from`
		'Array.foo(foo);',
		// Not `Array`
		'foo.from(foo);',
		// `callee.object.type` is not a `Identifier`
		'lib.Array.from(foo);',
		// More/Less arguments
		'Array.from();',
		'Array.from(foo, mapFn, thisArg, extra);',
		'Array.from(...argumentsArray);',
		'Array.from(set, mapFn).reduce(() => {});',
		'Array.from(set, mapFn, thisArg).reduce(() => {});',
		'Array.from(set, () => {}, thisArg).reduce(() => {});',
		// FirstArgument is `ObjectExpression`
		'Array.from({length: 10});',
		// `prefer-array-from-range` handles range arrays.
		'Array.from(Array(length).keys());',
		'Array.from(new Array(length).keys());',
		typescript('Array.from((Array(length) as number[]).keys());'),
		// `prefer-iterator-concat` handles multi-spread arrays.
		'Array.from([...a, ...b], )',
		'Array.from([...a, ...b])',
	],
	invalid: [
		'const x = Array.from(set);',
		'Array.from(set).map(() => {});',
		'Array.from(new Set([1, 2])).map(() => {});',
		'Array.from(document.querySelectorAll("*")).map(() => {});',

		// Semicolon
		// #254
		outdent`
			const foo = []
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = "1"
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = null
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = true
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = 1
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = /./
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = /./g
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = bar
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = bar.baz
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			function* foo() {
				yield Array.from(arrayLike).forEach(doSomething)
			}
		`,
		outdent`
			const foo = \`bar\`
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = [];
			Array.from(arrayLike).forEach(doSomething)
		`,
		// https://github.com/angular/angular/blob/9e70bcb34f91d439f5203dc22a44f323d02c4648/packages/benchpress/src/webdriver/selenium_webdriver_adapter.ts#L37
		// TokenType of `of` is `Identifier`
		outdent`
			for (const key of Array.from(arrayLike)) {
			}
		`,
		// TokenType of `in` is `Keyword`
		outdent`
			for (const key in Array.from(arrayLike)) {
			}
		`,
		// https://github.com/facebook/relay/blob/c7dd4cc33eb2dba82629884bff865f0905fc269e/packages/relay-compiler/transforms/ValidateUnusedVariablesTransform.js#L57
		// eslint-disable-next-line no-template-curly-in-string
		'const foo = `${Array.from(arrayLike)}`',
		// https://github.com/angular/angular/blob/9e70bcb34f91d439f5203dc22a44f323d02c4648/packages/service-worker/worker/testing/cache.ts#L48
		outdent`
			async function foo(){
				return await Array.from(arrayLike)
			}
		`,

		// https://github.com/gatsbyjs/gatsby/blob/e720d8efe58eba0f6fae9f26ec8879128967d0b5/packages/gatsby/src/bootstrap/page-hot-reloader.js#L30
		outdent`
			foo()
			Array.from(arrayLike).forEach(doSomething)
		`,
		// https://github.com/gatsbyjs/gatsby/blob/4ab3f194cf5d6dcafcb2a75d9604aac79d963554/packages/gatsby/src/redux/__tests__/nodes.js#L277
		outdent`
			const foo = {}
			Array.from(arrayLike).forEach(doSomething)
		`,

		'(Array).from(foo)',
		'(Array.from)(foo)',
		'((Array).from)(foo)',
		'(Array).from((0, foo))',
		'(Array.from)((0, foo))',
		'((Array).from)((0, foo))',
		'Array.from(a ? b : c)',
		'Array.from((0, a))',
		'Array.from([...iterator.toArray(), ...other])',
		'Array.from([1])',
		// `Map` is an iterable too
		'Array.from(new Map([["a", 1]]))',
		// Holey array literal: `Array.from` densifies holes, so the fix must spread
		'Array.from([1,,3])',
		'Array.from([,])',
		'Array.from([1, , 3, ,])',
		'Array.from((/* keep */ [1]))',
		'Array.from((/* comment */ foo))',
		'/* 1 */ Array /* 2 */ .from /* 3 */ ( /* 4 */ a /* 5 */,)',
		// Comments inside should prevent autofix
		'Array.from(/* comment */ foo)',
	],
});

// `Array#concat`
ruleTest.snapshot({
	valid: [
		'new Array.concat(1)',
		'concat(1)',
		'array[concat](1)',
		'"foo".concat("bar")',
		'string.concat("bar")',
		'string.concat("bar", "baz")',
		'foo.concat("bar")',
		'foo.concat("bar", "baz")',
		// eslint-disable-next-line no-template-curly-in-string
		'`${foo}`.concat("bar")',
		outdent`
			const string = 'foo';
			foo = string.concat("bar");
		`,
		outdent`
			let test = 'foo';
			test = test.concat('bar');
		`,
		outdent`
			const suffix = 'bar';
			foo.concat(suffix);
		`,
		// Non-literal receivers with string arguments are skipped, even when they may be arrays.
		outdent`
			const array = [,];
			array.concat("bar");
		`,
		// #1068
		'const bufA = Buffer.concat([buf1, buf2, buf3], totalLength);',
		'Buffer.concat([buffer]).concat(other)',
		'import {Buffer} from "node:buffer"; Buffer.concat([buffer]).concat(other)',
		'import {Buffer as NodeBuffer} from "node:buffer"; NodeBuffer.concat([buffer]).concat(other)',
		'import * as buffer from "node:buffer"; buffer.Buffer.concat([value]).concat(other)',
		'global.Buffer.concat([buffer]).concat(other)',
		'globalThis.Buffer.concat([buffer]).concat(other)',
		'Foo.concat(1)',
		'FooBar.concat(1)',
		'global.Buffer.concat([])',
		// #1809
		'["1", "2"].join(",").concat("...")',
		'foo.join(",").concat("...")',
		'foo.join().concat(bar)',
		'foo.join(foo, bar).concat("...")',
		'foo.join(foo, bar).concat(bar)',
		'(a + b).concat(c)',
		'(/./).concat(value)',
		'({concat() {}}).concat(value)',
		'(function () {}).concat(value)',
		'(() => {}).concat(value)',
		'(class {}).concat(value)',
		'new Chainable().concat(value)',
		'String(value).concat(other)',
		'Number(value).concat(other)',
		'Boolean(value).concat(other)',
		'BigInt(value).concat(other)',
		'RegExp(value).concat(other)',
		'if (!Array.isArray(foo)) { foo.concat(bar); }',
		'if (Array.isArray(foo)) {} else { foo.concat(bar); }',
		'if (!Array.isArray(foo)) { foo = foo.concat(bar); }',
		'let foo; if (!Array.isArray(foo)) { foo = foo.concat(bar); }',
		outdent`
			let result = [];
			for (const chunk of chunks) {
				result = result.concat(chunk);
			}
		`,
		outdent`
			let result = [];
			for (const chunk of chunks) {
				result = result.concat([chunk]);
			}
		`,
		outdent`
			let result = [];
			for (const chunk of chunks) {
				result = (result.concat([chunk]));
			}
		`,
		outdent`
			for (let result = []; condition; result = result.concat(chunk)) {}
		`,
		outdent`
			for (let result = []; condition;) {
				result = result.concat(chunk);
			}
		`,
		typescript(outdent`
			let result = [] as string[];
			for (const chunk of chunks) {
				result = (result as string[]).concat(chunk);
			}
		`),
		typescript(outdent`
			let result = [] as string[];
			for (const chunk of chunks) {
				result = (result.concat(chunk) as string[]);
			}
		`),
		'if (!Array.isArray(object.foo)) { object.foo = object.foo.concat(bar); }',
		'if (!Array.isArray(object["foo"])) { object.foo.concat(bar); }',
		'let foo; if (Array.isArray(foo)) { foo = []; } else { foo.concat(bar); }',
		'let foo; if (!Array.isArray(foo)) { const mutate = () => { foo = []; }; foo.concat(bar); }',
		// `Iterator.concat()`
		'Iterator.concat(2)',
		'Iterator.concat([2, 3])',
		{
			code: 'interface ApolloLink { concat(next: ApolloLink): ApolloLink; } function foo(link: ApolloLink) { link.concat(next); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'import type {ApolloLink} from "apollo-link"; function foo(link: ApolloLink) { link.concat(next); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'import type {ApolloLink as Link} from "apollo-link"; function foo(link: Link) { link.concat(next); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'import type * as Apollo from "apollo-link"; function foo(link: Apollo.ApolloLink) { link.concat(next); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'import type * as Apollo from "apollo-link"; function foo(link: Apollo.Types.ApolloLink) { link.concat(next); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Link = import("apollo-link").ApolloLink; declare const link: Link; link.concat(next);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Link = import("apollo-link").Apollo.ApolloLink; declare const link: Link; link.concat(next);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'interface ApolloLink { concat(next: ApolloLink): ApolloLink; } const link: ApolloLink = getLink(); link.concat(next);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'interface ApolloLink { concat(next: ApolloLink): ApolloLink; } (link as ApolloLink).concat(next);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'interface ApolloLink { concat(next: ApolloLink): ApolloLink; } (<ApolloLink>link).concat(next);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'interface ApolloLink { concat(next: ApolloLink): ApolloLink; } (link satisfies ApolloLink).concat(next);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'interface ApolloLink { concat(next: ApolloLink): ApolloLink; } function foo(link: ApolloLink) { link!.concat(next); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'interface ApolloLink { concat(next: ApolloLink): ApolloLink; } type Link = ApolloLink; function foo(link: Link) { link.concat(next); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'interface ApolloLink { concat(next: ApolloLink): ApolloLink; } function foo<Link extends ApolloLink>(link: Link) { link.concat(next); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(value: string | number) { value.concat(next); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(value: string) { value.concat(other); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(value: Buffer) { value.concat(next); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(value: {concat(next: unknown): unknown}) { value.concat(next); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '({concat() {}} as any).concat(value);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(String(value) as any).concat(other);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(new Chainable() as any).concat(value);',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('class Chainable { concat(next: Chainable) { return next; } } declare function getLink(): Chainable; const link = getLink(); link.concat(next);'),
		typeAware('interface Link { concat(next: Link): Link; } declare const link: Link; link.concat(next);'),
	],
	invalid: [
		'[1].concat(2)',
		'[1].concat("bar")',
		'[1].concat([2, 3])',
		'[1].concat(2,)',
		'[1].concat([2, ...bar],)',
		'[1,].concat(2)',
		'[1,].concat([2, 3])',
		'[1,].concat(2,)',
		'[1,].concat([2, 3],)',
		'Array(1).concat(2)',
		'new Array(1).concat(2)',
		'Array(1).concat("bar")',
		'new Array(1).concat("bar")',
		'Array().concat("bar")',
		'new Array().concat("bar")',
		'Array(1, 2).concat("bar")',
		'globalThis.Array().concat("bar")',
		'global["Array"]().concat("bar")',
		'new globalThis["Array"]().concat("bar")',
		'Array(1).concat()',
		'new Array(1).concat()',
		'Array(1).concat(foo)',
		'new Array(1).concat(foo)',
		'globalThis.Array(1).concat(2)',
		'globalThis.Array(1).concat(foo)',
		'global.Array(1).concat(2)',
		'globalThis["Array"](1).concat(2)',
		'global["Array"](1).concat(foo)',
		'(new globalThis.Array(1)).concat(2)',
		'(new global.Array(1)).concat(foo)',
		'(new globalThis["Array"](1)).concat(2)',
		'(new global["Array"](1)).concat(foo)',
		'foo.concat(Array(1))',
		'foo.concat(new Array(1))',
		'foo.concat(globalThis["Array"](1))',
		'foo.concat(bar, Array(1))',
		'foo.concat(bar, new Array(1))',
		'foo.concat(bar, globalThis["Array"](1))',
		'const Buffer = {concat: () => []}; Buffer.concat([buffer]).concat(other)',
		'const global = {Buffer: {concat: () => []}}; global.Buffer.concat([buffer]).concat(other)',
		'(( (( (( [1,] )).concat ))( (([2, 3])) ,) ))',
		'(( (( (( [1,] )).concat ))( (([2, 3])) , bar ) ))',
		'foo.concat(2)',
		'foo.concat([2, 3])',
		'foo.concat(2,)',
		'foo.concat([2, 3],)',
		'(( (( ((foo)).concat ))( (([2, 3])) ,) ))',
		'(( (( ((foo)).concat ))( (([2, 3])) , bar ) ))',
		// Semicolon
		outdent`
			bar()
			foo.concat(2)
		`,
		'const foo = foo.concat(2)',
		'const foo = () => foo.concat(2)',
		outdent`
			const five = 2 + 3;
			foo.concat(five);
		`,
		outdent`
			const array = [2 + 3];
			foo.concat(array);
		`,
		'foo.concat([bar])',
		'foo.concat(bar)',
		'Array.from(set).concat([2, 3])',
		'Array.from(set).concat("bar")',
		'foo.concat([2, 3]).concat(4)',
		'foo.concat(2, 3)',
		'foo.concat(2, bar)',
		// This is output of last case
		'[...foo, 2].concat(bar)',
		'let sortedScores = scores.concat().sort((a, b) => b[0] - a[0]);',
		// Suggestion output should include fixable arguments after the first one
		'foo.concat(bar, 2, 3)',
		'foo.concat(bar, 2, 3, baz)',
		// Parentheses
		'async function a() {return [].concat(await bar)}',
		'async function a() {return [].concat((0, bar))}',
		'async function a() {return [].concat(((await bar)))}',
		'foo.concat((0, 1))',
		'async function a() {return (await bar).concat(1)}',
		// No fix, no suggestions
		'[].concat(...bar)',
		// Should keep holes
		'[].concat([,], [])',
		'[,].concat([,], [,])',
		'[,].concat([,,], [,])',
		'[,].concat([,], [,,])',
		'[1].concat([2,], [3,])',
		'[1].concat([2,,], [3,,])',
		'[1,].concat([2,], [3,])',
		'[1,].concat([2,,], [3,,])',
		// Should not insert extra holes
		'[].concat([], [])',
		outdent`
			const EMPTY_STRING = ""
			const EMPTY_STRING_IN_ARRAY = ""
			const EMPTY_STRING_IN_ARRAY_OF_ARRAY = ""
			const array = [].concat(
				undefined,
				null,
				EMPTY_STRING,
				false,
				0,
				[EMPTY_STRING_IN_ARRAY],
				[[EMPTY_STRING_IN_ARRAY_OF_ARRAY]]
			)
		`,
		'[].concat((a.b.c), 2)',
		'[].concat(a.b(), 2)',
		'foo.concat(bar, 2, [3, 4], baz, 5, [6, 7])',
		'foo.concat(bar, 2, 3, ...baz)',
		'notClass.concat(1)',
		'_A.concat(1)',
		// Constants
		'FOO.concat(1)',
		'A.concat(1)',
		'Foo.x.concat(1)',
		// Semicolon
		'if (test) foo.concat(1)',
		'if (test) {} else foo.concat(1)',
		'if (test) {} else foo.concat(1)',
		'for (;;) foo.concat(1)',
		'for (a in b) foo.concat(1)',
		'for (a in b) foo.concat(1)',
		'for (const a of b) foo.concat(1)',
		'while (test) foo.concat(1)',
		'do foo.concat(1); while (test)',
		{
			code: 'with (foo) foo.concat(1)',
			languageOptions: {parserOptions: {sourceType: 'script'}},
		},
		// Code from example in docs
		outdent`
			const baz = [2];
			call(foo, ...[bar].concat(baz));
		`,
		'foo.concat((/* keep */ [1]))',
		'[1].concat([/* keep */ 2])',
		'[1].concat([2, /* keep */], [3])',
		'foo.concat((/* keep */ []))',
		'foo.concat([/* keep */])',
		'foo.concat([1], /* keep */ bar)',
		'foo.concat(/* keep */ [1], bar)',
		'if (Array.isArray(foo)) { foo.concat(bar); }',
		'const Array = {isArray: () => false}; if (!Array.isArray(foo)) { foo.concat(bar); }',
		'if (!Array.isArray(foo)) { const foo = []; foo.concat(bar); }',
		'if (!Array.isArray(foo)) { foo = []; foo.concat(bar); }',
		'let foo; if (!Array.isArray(foo)) { foo = []; foo.concat(bar); }',
		'function f(foo) { if (!Array.isArray(foo)) { var foo = []; foo.concat(bar); } }',
		'let object = {foo: maybe}; if (!Array.isArray(object.foo)) { object = {foo: []}; object.foo.concat(bar); }',
		'let object = {foo: maybe}; if (!Array.isArray(object.foo)) { object["foo"] = []; object.foo.concat(bar); }',
		'const key = "foo"; let object = {foo: maybe}; if (!Array.isArray(object.foo)) { object[key] = []; object.foo.concat(bar); }',
		'let object = {foo: maybe}; if (!Array.isArray(object.foo)) { object[key] = []; object.foo.concat(bar); }',
		'let foo; if (!Array.isArray(foo)) { [foo] = [[]]; foo.concat(bar); }',
		'const object = {foo: maybe}; if (!Array.isArray(object.foo)) { const object = {foo: []}; object.foo.concat(bar); }',
		'if (!Array.isArray(object.foo)) { object.foo = []; object.foo.concat(bar); }',
		'let foo; if (!Array.isArray(foo)) { callbacks.push(() => foo.concat(bar)); }',
		outdent`
			foo.concat(
				// keep
				[1],
				bar,
			)
		`,
		outdent`
			foo.concat(
				// keep
				[1],
			)
		`,
		'foo/* keep */.concat([1], bar)',
		'foo.concat(/* keep */ [1])',
		'foo/* keep */.concat([1])',
		typescript('function foo(array: string[]) { array.concat(item); }'),
		typescript('function foo(array: string[]) { array.concat("item"); }'),
		typescript('(Array(1) as number[]).concat(2);'),
		{
			code: '(Array(1)!).concat(foo);',
			languageOptions: {parser: parsers.typescript},
		},
		typescript('(<number[]>Array(1)).concat(2);'),
		{
			code: '(Array(1) satisfies number[]).concat(2);',
			languageOptions: {parser: parsers.typescript},
		},
		typescript('declare const Items: string[]; Items.concat(item);'),
		typescript('function foo(array: readonly string[]) { array.concat(item); }'),
		{
			code: 'function foo(array: [string, string]) { array.concat(item); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(array: Array<string>) { array.concat(item); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(array: ReadonlyArray<string>) { array.concat(item); }',
			languageOptions: {parser: parsers.typescript},
		},
		typescript('type Strings = string[]; function foo(array: Strings) { array.concat(item); }'),
		typescript('function foo<ArrayType extends string[]>(array: ArrayType) { array.concat(item); }'),
		typescript('interface ApolloLink { concat(next: ApolloLink): ApolloLink; } function foo(value: string[] | ApolloLink) { value.concat(item); }'),
		{
			code: 'import type {Strings} from "./types"; declare const array: Strings; array.concat(item);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo<T>(value: T) { value.concat(item); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type ApolloLink = unknown; declare const link: ApolloLink; link.concat(next);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo<ApolloLink>(link: ApolloLink) { link.concat(next); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'namespace Apollo { export type ApolloLink = unknown; } declare const link: Apollo.ApolloLink; link.concat(next);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'namespace Apollo { export namespace Types { export type ApolloLink = unknown; } } declare const link: Apollo.Types.ApolloLink; link.concat(next);',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('function foo<T>(value: T) { value.concat(item); }'),
		typeAware('type Strings = ReturnType<() => string[]>; declare const array: Strings; array.concat(item);'),
		typeAware('declare function getArray(): string[]; const array = getArray(); array.concat(item);'),
		// Comments inside should prevent autofix
		'[1].concat(/* comment */ 2)',
		outdent`
			[1].concat(
				// eslint-disable-next-line no-restricted-syntax
				[2, 3],
			)
		`,
	],
});

test('fixes chained empty concat calls with no-useless-spread', t => {
	const linter = new Linter();
	const result = linter.verifyAndFix(
		'const a = [].concat([1]).concat([2]);',
		[
			{
				files: ['**'],
				languageOptions: DEFAULT_LANGUAGE_OPTIONS,
				plugins: {
					'rule-to-test': {
						rules: {
							'prefer-spread': rule,
							'no-useless-spread': plugin.rules['no-useless-spread'],
						},
					},
				},
				rules: {
					'rule-to-test/prefer-spread': 'error',
					'rule-to-test/no-useless-spread': 'error',
				},
			},
		],
		{filename: 'index.js'},
	);

	t.is(result.output, 'const a = [1, 2];');
});

// `Array#slice`
ruleTest.snapshot({
	valid: [
		'new Array.slice()',
		'slice()',
		'array[slice]()',
		'array.slice',
		'array.slice(1)',
		'array.slice(...[])',
		'array.slice(...[0])',
		'array.slice(0 + 0)',
		'array.slice("")',
		'array.slice(null)',
		'const ZERO = 0;array.slice(ZERO)',
		'array.slice(0, array.length)',
		'array.slice(0, 0)',
		'array.notSlice()',
		// Why would someone write these
		'[...foo].slice()',
		'[foo].slice()',
		// Ignored
		'arrayBuffer.slice()',
		'blob.slice()',
		'buffer.slice()',
		'file.slice()',
		'Foo.slice()',
		'class A {foo() {this.slice()}}',
		'scopeManager?.scopes.slice()',
		'object?.getArray().slice()',
		typescript('object?.array!.slice()'),
		typescript('object?.getArray()!.slice()'),
		'"".slice()',
		// eslint-disable-next-line no-template-curly-in-string
		'`${foo}`.slice()',
		'(a + b).slice()',
		'foo.join().slice()',
		outdent`
			const test = 'foo';
			const copy = test.slice();
		`,
		// TypedArray/ArrayBuffer constructors - spreading doesn't work or changes type
		'new ArrayBuffer(10).slice()',
		'new ArrayBuffer(10).slice(0)',
		'new SharedArrayBuffer(10).slice()',
		'new SharedArrayBuffer(10).slice(0)',
		'new Int8Array([1, 2, 3]).slice()',
		'new Int8Array([1, 2, 3]).slice(0)',
		'new Uint8Array([10, 20, 30, 40, 50]).slice()',
		'new Uint8Array([10, 20, 30, 40, 50]).slice(0)',
		'new Uint8ClampedArray([1, 2, 3]).slice()',
		'new Int16Array([1, 2, 3]).slice()',
		'new Uint16Array([1, 2, 3]).slice()',
		'new Int32Array([1, 2, 3]).slice()',
		'new Uint32Array([1, 2, 3]).slice()',
		'new Float16Array([1, 2, 3]).slice()',
		'new Float32Array([1, 2, 3]).slice()',
		'new Float64Array([1, 2, 3]).slice()',
		'new BigInt64Array([1n, 2n, 3n]).slice()',
		'new BigUint64Array([1n, 2n, 3n]).slice()',
	],
	invalid: [
		'array.slice()',
		'array.slice().slice()',
		'array.slice(1).slice()',
		'array.slice().slice(1)',
		'const copy = array.slice()',
		'(( (( (( array )).slice ))() ))',
		'(scopeManager?.scopes).slice()',
		typescript('(object?.array as string[]).slice()'),
		// Semicolon
		outdent`
			bar()
			foo.slice()
		`,
		'array.slice(0)',
		'array.slice(0b0)',
		'array.slice(0.00)',
		'array.slice(0.00, )',
		'(/* comment */ array).slice()',
		// Comments inside should prevent autofix
		'array.slice(/* comment */)',
	],
});

// `Array#toSpliced`
ruleTest.snapshot({
	valid: [
		'new Array.toSpliced()',
		'toSpliced()',
		'array[toSpliced]()',
		'array.toSpliced',
		'array.toSpliced(0)',
		'array.toSpliced(...[])',
		'array.toSpliced(...[0])',
		'array.toSpliced(0 + 0)',
		'array.toSpliced("")',
		'array.toSpliced(null)',
		'const ZERO = 0;array.toSpliced(0, ZERO)',
		'array.toSpliced(0, array.length)',
		'array.toSpliced(0, 0)',
		'array.notToSpliced()',
		// Why would someone write these
		'[...foo].toSpliced()',
		'[foo].toSpliced()',
		'array.toSpliced(100, 0)',
		'array.toSpliced(-1, 0)',
		'object?.array.toSpliced()',
		typescript('object?.array!.toSpliced()'),
		typescript('object?.getArray()!.toSpliced()'),
	],
	invalid: [
		'array.toSpliced()',
		'array.toSpliced().toSpliced()',
		'const copy = array.toSpliced()',
		'(( (( (( array )).toSpliced ))() ))',
		'(object?.array).toSpliced()',
		typescript('(object?.array as string[]).toSpliced()'),
		// Semicolon
		outdent`
			bar()
			foo.toSpliced()
		`,
		// `{String,TypedArray}#toSpliced` are wrongly detected
		'"".toSpliced()',
		'new Uint8Array([10, 20, 30, 40, 50]).toSpliced()',
		// Comments inside should prevent autofix
		'array.toSpliced(/* comment */)',
	],
});

// `String#split('')`
ruleTest.snapshot({
	valid: [
		'new foo.split("")',
		'split("")',
		'string[split]("")',
		'string.split',
		'string.split(1)',
		'string.split(..."")',
		'string.split(...[""])',
		'string.split("" + "")',
		'string.split(0)',
		'string.split(false)',
		'string.split(undefined)',
		'string.split(0n)',
		'string.split(null)',
		'string.split(/""/)',
		'string.split(``)',
		'const EMPTY_STRING = ""; string.split(EMPTY_STRING)',
		'string.split("", limit)',
		'"".split(string)',
		'string.split()',
		'string.notSplit("")',
		'const notString = 0; notString.split("")',
		'"string".split("")',
		'"string".split(\'\')',
		'unknown.split("")',
		'const characters = "string".split("")',
		'(( (( (( "string" )).split ))( (("")) ) ))',
		outdent`
			bar()
			foo.split("")
		`,
		'"🦄".split("")',
		'const {length} = "🦄".split("")',
		'"string".split(/* comment */ "")',
		'unknown.split(/* comment */ "")',
		{
			code: 'const text: string = value; text.split("")',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [],
});
