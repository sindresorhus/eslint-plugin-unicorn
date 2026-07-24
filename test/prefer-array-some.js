import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const ERROR_ID_ARRAY_SOME = 'some';
const SUGGESTION_ID_ARRAY_SOME = 'some-suggestion';
const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});
const invalidCase = ({code, suggestionOutput, method, ...testCase}) => ({
	...testCase,
	code,
	errors: [
		{
			messageId: ERROR_ID_ARRAY_SOME,
			data: {method},
			suggestions: [
				{
					messageId: SUGGESTION_ID_ARRAY_SOME,
					data: {method},
					output: suggestionOutput,
				},
			],
		},
	],
});

test({
	valid: [
		// Not `boolean`
		'const bar = foo.find(fn)',
		'const bar = foo.find(fn) || baz',
		'if (foo.find(fn) ?? bar) {}',
		'let hasFoo = foo.find(fn); if (hasFoo) {}',
		'const hasFoo = foo.find(fn); hasFoo.value;',
		'const hasFoo = foo.find(fn); if (hasFoo) { const value = hasFoo; }',
		'const hasFoo = foo.find(fn); const value = other || hasFoo;',
		'const {hasFoo} = foo.find(fn); if (hasFoo) {}',
		'export const hasFoo = foo.find(fn);',
		'const hasFoo = foo.find(fn); export {hasFoo};',
		'const hasFoo = foo.find(fn);',
		'const hasFoo = foo.find(fn); if (hasFoo === undefined) {}',
		'const hasFoo = foo.find(fn); if (hasFoo) {}',
		'const hasFoo = foo.find(fn); if (hasFoo || !hasFoo || Boolean(hasFoo)) {}',
		'const Boolean = value => value; if (Boolean(foo.find(fn))) {}',
		'function unicorn(Boolean) { if (Boolean(foo.find(fn))) {} }',
		'const font = this.form[$globalData].fontFinder.find(typeface); if (!font) {}',
		'if (new Foo().find(fn)) {}',
		'if (new Foo().findLast(fn)) {}',
		'new Foo().findIndex(fn) !== -1',
		'new Foo().findLastIndex(fn) !== -1',
		'new Foo().filter(fn).length > 0',
		'if ("foo".find(fn)) {}',
		'const value = "foo"; if (value.find(fn)) {}',
		['if ((`foo$', '{bar}`).find(fn)) {}'].join(''),
		'if (({find() {}}).find(fn)) {}',
		'if ((function () {}).find(fn)) {}',
		'if ((() => {}).find(fn)) {}',
		'if ((class {}).find(fn)) {}',
		['(`foo$', '{bar}`).findIndex(fn) !== -1'].join(''),
		['(`foo$', '{bar}`).filter(fn).length > 0'].join(''),
		'({findIndex() {}}).findIndex(fn) !== -1',
		'({filter() {}}).filter(fn).length > 0',
		'const collection = {find() {}}; if (collection.find(fn)) {}',
		'const store = new Store(); if (store.find(fn)) {}',
		typeAware('interface QueryCache {find(queryKey: string[]): unknown} declare const queryClient: {getQueryCache(): QueryCache}; queryClient.getQueryCache().find(["foo"]) ? "foo" : "bar";'),
		typeAware('interface QueryCache {findIndex(predicate: Function): number} declare const queryCache: QueryCache; queryCache.findIndex(fn) !== -1;'),
		typeAware('interface QueryCache {filter(predicate: Function): {length: number}} declare const queryCache: QueryCache; queryCache.filter(fn).length > 0;'),
		typeAware('interface QueryCache {findIndex(predicate: Function): number} declare function getQueryCache(): QueryCache; getQueryCache().findIndex(fn) !== -1;'),
		typeAware('interface QueryCache {filter(predicate: Function): {length: number}} declare function getQueryCache(): QueryCache; getQueryCache().filter(fn).length > 0;'),
		typeAware('class Store {find(key: string): boolean {return key.length > 0}} const store = new Store(); if (store.find("key")) {}'),
		typeAware('class Store extends HTMLElement {find(key: string): boolean {return key.length > 0}} const store = new Store(); if (store.find("key")) {}'),
		typeAware('function foo(collection: {find(predicate: Function): unknown}) { if (collection.find(fn)) {} }'),
		typeAware('function foo<T extends {find(predicate: Function): unknown}>(collection: T) { if (collection.find(fn)) {} }'),
		{
			code: 'function foo(collection: {find(predicate: Function): unknown}) { if (collection.find(fn)) {} }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(collection: {findIndex(predicate: Function): number}) { collection.findIndex(fn) !== -1; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(collection: {filter(predicate: Function): {length: number}}) { collection.filter(fn).length > 0; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Collection = {find(predicate: Function): unknown}; const collection: Collection = [] as never; if (collection.find(fn)) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Collection = {findIndex(predicate: Function): number}; ([] as Collection).findIndex(fn) !== -1',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Collection = {filter(predicate: Function): {length: number}}; ([] as Collection).filter(fn).length > 0',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const hasFoo: Item | undefined = foo.find(fn); if (hasFoo) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const hasFoo = foo.find<Item>(fn); if (hasFoo) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const hasFoo = foo.findLast<Item>(fn); if (hasFoo) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if (foo.find<Item>(fn)) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if (foo.findLast<Item>(fn)) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo.find<Item>(fn) !== undefined',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo.findLast<Item>(fn) !== undefined',
			languageOptions: {parser: parsers.typescript},
		},

		// Not matched `CallExpression`
		...[
			// Not `CallExpression`
			'new foo.find(fn)',
			// Not `MemberExpression`
			'find(fn)',
			// `callee.property` is not a `Identifier`
			'foo["find"](fn)',
			'foo["fi" + "nd"](fn) /* find */',
			'foo[`find`](fn)',
			// Computed
			'foo[find](fn)',
			// Not `.find`
			'foo.notFind(fn) /* find */',
			// More or less argument(s)
			'foo.find()',
			'foo.find(fn, thisArgument, extraArgument)',
			'foo.find(...argumentsArray)',
		].flatMap(code => [
			`if (${code}) {}`,
			`if (${code.replace('find', 'findLast')}) {}`,
		]),
	],
	invalid: [
		...[
			'const bar = !foo.find(fn)',
			'const bar = Boolean(foo.find(fn))',
			'const bar = !!Boolean(foo.find(fn))',
			'if (foo.find(fn)) {}',
			'const bar = foo.find(fn) ? 1 : 2',
			'while (foo.find(fn)) foo.shift();',
			'do {foo.shift();} while (foo.find(fn));',
			'for (; foo.find(fn); ) foo.shift();',
			'const hasFoo = [].find(fn); if (hasFoo) {}',
			'const array = []; const hasFoo = array.find(fn); if (hasFoo) {}',
		].flatMap(code => [
			invalidCase({
				code,
				suggestionOutput: code.replace('find', 'some'),
				method: 'find',
			}),
			invalidCase({
				code: code.replace('find', 'findLast'),
				suggestionOutput: code.replace('find', 'some'),
				method: 'findLast',
			}),
		]),
		// Comments
		invalidCase({
			code: 'console.log(foo /* comment 1 */ . /* comment 2 */ find /* comment 3 */ (fn) ? a : b)',
			suggestionOutput: 'console.log(foo /* comment 1 */ . /* comment 2 */ some /* comment 3 */ (fn) ? a : b)',
			method: 'find',
		}),
		// This should not be reported, but `jQuery.find()` is always `truthy`,
		// It should not use as a boolean
		invalidCase({
			code: 'if (jQuery.find(".outer > div")) {}',
			suggestionOutput: 'if (jQuery.some(".outer > div")) {}',
			method: 'find',
		}),
		// Actual messages
		{
			code: 'if (bar.find(fn)) {}',
			errors: [
				{
					message: 'Prefer `.some(…)` over `.find(…)`.',
					suggestions: [
						{
							desc: 'Replace `.find(…)` with `.some(…)`.',
							output: 'if (bar.some(fn)) {}',
						},
					],
				},
			],
		},
		{
			code: 'if (bar.findLast(fn)) {}',
			errors: [
				{
					message: 'Prefer `.some(…)` over `.findLast(…)`.',
					suggestions: [
						{
							desc: 'Replace `.findLast(…)` with `.some(…)`.',
							output: 'if (bar.some(fn)) {}',
						},
					],
				},
			],
		},
		...[
			'if ([].find(fn)) {}',
			'if (Array().find(fn)) {}',
			'if (new Array().find(fn)) {}',
			'if (Array.from(iterable).find(fn)) {}',
			'if (Array.of(value).find(fn)) {}',
			'const array = []; if (array.find(fn)) {}',
			'const array = Array(); if (array.find(fn)) {}',
			'const array = new Array(); if (array.find(fn)) {}',
			'const array = Array.from(iterable); if (array.find(fn)) {}',
			'const array = Array.of(value); if (array.find(fn)) {}',
			'function foo(array: string[]) { if (array.find(fn)) {} }',
			'function foo(array: readonly string[]) { if (array.find(fn)) {} }',
			'function foo(array: ReadonlyArray<string>) { if (array.find(fn)) {} }',
			'function foo(array: [string, string]) { if (array.find(fn)) {} }',
			'function foo<T extends string[]>(array: T) { if (array.find(fn)) {} }',
			'type Items = string[]; function foo(items: Items) { if (items.find(fn)) {} }',
			'interface Items extends Array<string> {} function foo(items: Items) { if (items.find(fn)) {} }',
		].map(code => invalidCase({
			code,
			languageOptions: {parser: parsers.typescript},
			suggestionOutput: code.replace('find', 'some'),
			method: 'find',
		})),
		invalidCase({
			code: 'function foo<T>(items: string[] | {find(predicate: Function): unknown} | T) { if (items.find(fn)) {} }',
			languageOptions: {parser: parsers.typescript},
			suggestionOutput: 'function foo<T>(items: string[] | {find(predicate: Function): unknown} | T) { if (items.some(fn)) {} }',
			method: 'find',
		}),
		invalidCase({
			code: 'type Items = string[] | {find(predicate: Function): unknown}; function foo(items: Items) { if (items.find(fn)) {} }',
			languageOptions: {parser: parsers.typescript},
			suggestionOutput: 'type Items = string[] | {find(predicate: Function): unknown}; function foo(items: Items) { if (items.some(fn)) {} }',
			method: 'find',
		}),
		invalidCase({
			code: 'type Collection = {find(predicate: Function): unknown}; if (([] satisfies Collection).find(fn)) {}',
			languageOptions: {parser: parsers.typescript},
			suggestionOutput: 'type Collection = {find(predicate: Function): unknown}; if (([] satisfies Collection).some(fn)) {}',
			method: 'find',
		}),
		invalidCase({
			...typeAware('declare function getItems(): string[]; if (getItems().find(fn)) {}'),
			suggestionOutput: 'declare function getItems(): string[]; if (getItems().some(fn)) {}',
			method: 'find',
		}),
		invalidCase({
			code: 'function foo(array: string[]) { const hasFoo = array.find(fn); if (hasFoo) {} }',
			languageOptions: {parser: parsers.typescript},
			suggestionOutput: 'function foo(array: string[]) { const hasFoo = array.some(fn); if (hasFoo) {} }',
			method: 'find',
		}),
		invalidCase({
			...typeAware('declare function getItems(): string[]; const hasFoo = getItems().find(fn); if (hasFoo) {}'),
			suggestionOutput: 'declare function getItems(): string[]; const hasFoo = getItems().some(fn); if (hasFoo) {}',
			method: 'find',
		}),
		invalidCase({
			...typeAware('function foo<T>(collection: T) { if (collection.find(fn)) {} }'),
			suggestionOutput: 'function foo<T>(collection: T) { if (collection.some(fn)) {} }',
			method: 'find',
		}),
	],
});

test.snapshot({
	valid: [],
	invalid: [
		'if (array.find(element => element === "🦄")) {}',
		'const foo = array.find(element => element === "🦄") ? bar : baz;',
		outdent`
			if (
				array
					.find(element => Array.isArray(element))
				// ^^^^ This should NOT report
					.find(x => x === 0)
				// ^^^^ This should report
			) {
			}
		`,
	],
});

// - `.filter(…).length > 0`
// - `.filter(…).length !== 0`
test.snapshot({
	valid: [
		// `> 0`
		'array.filter(fn).length > 0.',
		'array.filter(fn).length > .0',
		'array.filter(fn).length > 0.0',
		'array.filter(fn).length > 0x00',
		'array.filter(fn).length < 0',
		'array.filter(fn).length >= 0',
		'0 > array.filter(fn).length',

		// `!== 0`
		'array.filter(fn).length !== 0.',
		'array.filter(fn).length !== .0',
		'array.filter(fn).length !== 0.0',
		'array.filter(fn).length !== 0x00',
		'array.filter(fn).length != 0',
		'array.filter(fn).length === 0',
		'array.filter(fn).length == 0',
		'array.filter(fn).length = 0',
		'0 !== array.filter(fn).length',

		// `>= 1`
		'array.filter(fn).length >= 1',
		'array.filter(fn).length >= 1.',
		'array.filter(fn).length >= 1.0',
		'array.filter(fn).length >= 0x1',
		'array.filter(fn).length > 1',
		'array.filter(fn).length < 1',
		'array.filter(fn).length = 1',
		'array.filter(fn).length += 1',
		'1 >= array.filter(fn).length',

		// `.length`
		'array.filter(fn)?.length > 0',
		'array.filter(fn)[length] > 0',
		'array.filter(fn).notLength > 0',
		'array.filter(fn).length() > 0',
		'+array.filter(fn).length >= 1',

		// `.filter`
		'array.filter?.(fn).length > 0',
		'array?.filter(fn).length > 0',
		'array.notFilter(fn).length > 0',
		'array.filter.length > 0',

		// `jQuery#filter`
		'$element.filter(":visible").length > 0',
		'var res = $module.filter(selector.disabled).length > 0;',
		'$module.filter(fn).length !== 0',
	],
	invalid: [
		'array.filter(fn).length > 0',
		'array.filter(fn).length !== 0',
		// Don't drop comments in the removed part
		'array.filter(fn).length /* keep */ > 0',
		'module$.filter(fn).length > 0',
		{
			code: 'type Collection = {filter(predicate: Function): {length: number}}; ([] satisfies Collection).filter(fn).length > 0',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Items = string[] | {filter(predicate: Function): {length: number}}; function foo(items: Items) { items.filter(fn).length > 0; }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('declare function getItems(): string[]; getItems().filter(fn).length > 0;'),
		outdent`
			if (
				((
					((
						((
							((
								array
							))
								.filter(what_ever_here)
						))
							.length
					))
					>
					(( 0 ))
				))
			);
		`,
		// A typed array shares `Array#filter()` and `Array#some()`
		{
			code: 'function f(array: Int8Array) { return array.filter(fn).length > 0; }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

// `.{findIndex,findLastIndex}(…) !== -1`
// `.{findIndex,findLastIndex}(…) != -1`
// `.{findIndex,findLastIndex}(…) > -1`
// `.{findIndex,findLastIndex}(…) === -1`
// `.{findIndex,findLastIndex}(…) == -1`
// `.{findIndex,findLastIndex}(…) >= 0`
// `.{findIndex,findLastIndex}(…) < 0`
test.snapshot({
	valid: [
		'foo.notMatchedMethod(bar) !== -1',
		'new foo.findIndex(bar) !== -1',
		'foo.findIndex(bar, extraArgument) !== -1',
		'foo.findIndex(bar) instanceof -1',
		'foo.findIndex(...bar) !== -1',
		// We are not ignoring ``{_,lodash,underscore}.{findIndex,findLastIndex}`
		// but it doesn't make sense to use them with one argument
		'_.findIndex(bar)',
		'_.findIndex(foo, bar)',
	],
	invalid: [
		...[
			'foo.findIndex(bar) !== -1',
			'foo.findIndex(bar) != -1',
			'foo.findIndex(bar) > - 1',
			'foo.findIndex(bar) === -1',
			'foo.findIndex(bar) == - 1',
			'foo.findIndex(bar) >= 0',
			'foo.findIndex(bar) < 0',
		].flatMap(code => [code, code.replace('findIndex', 'findLastIndex')]),
		'foo.findIndex(bar) !== (( - 1 ))',
		'foo.findIndex(element => element.bar === 1) !== (( - 1 ))',
		// Don't drop comments in the removed part
		'foo.findIndex(bar) !== /* keep */ -1',
		{
			code: 'type Collection = {findIndex(predicate: Function): number}; ([] satisfies Collection).findIndex(fn) !== -1',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Items = string[] | {findIndex(predicate: Function): number}; function foo(items: Items) { items.findIndex(fn) !== -1; }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('declare function getItems(): string[]; getItems().findIndex(fn) !== -1;'),
	],
});

test.vue({
	valid: [],
	invalid: [
		invalidCase({
			code: '<template><div v-if="foo.find(fn)"></div></template>',
			suggestionOutput: '<template><div v-if="foo.some(fn)"></div></template>',
			method: 'find',
		}),
		invalidCase({
			code: '<script>if (foo.findLast(fn));</script>',
			suggestionOutput: '<script>if (foo.some(fn));</script>',
			method: 'findLast',
		}),
		{
			code: '<template><div v-if="foo.filter(fn).length > 0"></div></template>',
			output: '<template><div v-if="foo.some(fn)"></div></template>',
			errors: 1,
		},
		{
			code: '<template><div v-if="foo.filter(fn).length !== 0"></div></template>',
			output: '<template><div v-if="foo.some(fn)"></div></template>',
			errors: 1,
		},
		{
			code: '<script>foo.findIndex(fn) !== -1;</script>',
			output: '<script>foo.some(fn) ;</script>',
			errors: 1,
		},
		{
			code: '<script>foo.findLastIndex(fn) !== -1;</script>',
			output: '<script>foo.some(fn) ;</script>',
			errors: 1,
		},
		{
			code: '<script>if (foo.filter(fn).length > 0);</script>',
			output: '<script>if (foo.some(fn));</script>',
			errors: 1,
		},
	],
});

// Compare with `undefined`
test.snapshot({
	valid: [
		'foo.find(fn) == 0',
		'foo.find(fn) != ""',
		'foo.find(fn) === null',
		'foo.find(fn) !== "null"',
		'foo.find(fn) >= undefined',
		'foo.find(fn) instanceof undefined',
		// We are not checking this right now
		'typeof foo.find(fn) === "undefined"',
	],
	invalid: [
		'foo.find(fn) == null',
		'foo.find(fn) == undefined',
		'foo.find(fn) === undefined',
		'foo.find(fn) != null',
		'foo.find(fn) != undefined',
		'foo.find(fn) !== undefined',
		'a = (( ((foo.find(fn))) == ((null)) )) ? "no" : "yes";',
		// Don't drop comments in the removed comparison part
		'foo.find(fn) === /* keep */ undefined',
	],
});
