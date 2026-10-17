import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

const linter = new Linter();

const linterConfig = {
	plugins: {unicorn: {rules: {'prefer-array-some': rule}}},
	rules: {'unicorn/prefer-array-some': 'error'},
};

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
		...[
			'const found = values.find(predicate); Boolean(found); use(found);',
			'const found = values.find(predicate); Boolean(found); if (found) {}',
			'const found = values.find(predicate); Boolean(found); !found;',
			'const found = values.find(predicate); Boolean(found && other);',
			'const found = values.find(predicate); Boolean(found, other);',
			'const found = values.find(predicate); new Boolean(found);',
			'const found = values.find(predicate); const Boolean = value => value; Boolean(found);',
			'function hasMatch(values, Boolean) { const found = values.find(predicate); return Boolean(found); }',
			'const found = values.find(predicate); Boolean(found); function hasMatch(Boolean) { return Boolean(found); }',
			'const found = new Store().find(predicate); Boolean(found);',
			'const values = {find() {}}; const found = values.find(predicate); Boolean(found);',
			'export const found = values.find(predicate); Boolean(found);',
			'const found = values.find(predicate); Boolean(found); export {found};',
			'let found = values.find(predicate); Boolean(found);',
			'const found = values.find(predicate); found = other; Boolean(found);',
			'const found = values.find(predicate); Boolean?.(found);',
			'const found = values?.find(predicate); Boolean(found);',
			'const found = values.find?.(predicate); Boolean(found);',
		].flatMap(code => [code, code.replaceAll('find', 'findLast')]),
		{
			code: 'const found: Item | undefined = values.find(predicate); Boolean(found);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const found = values.find<Item>(predicate); Boolean(found);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const found = values.find(predicate); Boolean(found as Item);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const found = values.find(predicate); Boolean(found); type Found = typeof found;',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('function hasMatch(values: {find(predicate: Function): unknown}) { const found = values.find(predicate); return Boolean(found); }'),
	],
	invalid: [
		invalidCase({
			code: outdent`
				function hasBigItem(array) {
					const foo = array.find(x => x > 2);
					return Boolean(foo);
				}
			`,
			suggestionOutput: outdent`
				function hasBigItem(array) {
					const foo = array.some(x => x > 2);
					return Boolean(foo);
				}
			`,
			method: 'find',
		}),
		...[
			'const found = values.find(predicate); const first = Boolean(found); const second = Boolean(found);',
			'const values = []; const found = values.find(predicate); Boolean(found); if (found) {}',
			'const found = ((values).find(/* keep */ predicate, receiver)); Boolean(/* keep */ (found));',
			'const found = values.find(predicate); doSomething(); !Boolean(found);',
			'const found = values.find(predicate); function hasMatch() { return Boolean(found); }',
			'const found = new Uint8Array([0, 1]).find(predicate); Boolean(found);',
		].flatMap(code => ['find', 'findLast'].map(method => invalidCase({
			code: code.replace('.find(', () => `.${method}(`),
			suggestionOutput: code.replace('.find(', '.some('),
			method,
		}))),
		invalidCase({
			code: 'function hasBigItem(array) { const foo = array.findLast(x => x > 2); return Boolean(foo); }',
			suggestionOutput: 'function hasBigItem(array) { const foo = array.some(x => x > 2); return Boolean(foo); }',
			method: 'findLast',
		}),
		invalidCase({
			code: 'function hasMatch(values: Uint8Array) { const found = values.find(predicate); return Boolean(found); }',
			suggestionOutput: 'function hasMatch(values: Uint8Array) { const found = values.some(predicate); return Boolean(found); }',
			languageOptions: {parser: parsers.typescript},
			method: 'find',
		}),
		...['find', 'findLast'].map(method => invalidCase({
			...typeAware(`function hasMatch(values: any) { const found = values.${method}(predicate); return Boolean(found); }`),
			suggestionOutput: 'function hasMatch(values: any) { const found = values.some(predicate); return Boolean(found); }',
			method,
		})),
	],
});

nodeTest('find results used through Boolean stay suggestions for falsy matches', t => {
	for (const method of ['find', 'findLast']) {
		const code = `function hasMatch(values) { const found = values.${method}(() => true); return Boolean(found); } hasMatch([0]);`;
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].fix, undefined);
		t.assert.strictEqual(messages[0].suggestions.length, 1);
		const {range, text} = messages[0].suggestions[0].fix;
		const suggestedCode = code.slice(0, range[0]) + text + code.slice(range[1]);
		t.assert.strictEqual(suggestedCode, code.replace(`.${method}(`, '.some('));
		t.assert.strictEqual(runInNewContext(code), false);
		t.assert.strictEqual(runInNewContext(suggestedCode), true);
	}
});

nodeTest('side-effect-free inline callbacks are autofixed', t => {
	for (const callback of ['value => value.id > 1', 'function (value) { return value.id > 1; }', '({id}) => id > 1', '(value, index) => index > 0 && value.id > 1']) {
		for (const values of ['[]', '[{id: 0}, {id: 1}]', '[{id: 2}, {id: 0}, {id: 3}]']) {
			for (const [code, output] of [
				[`${values}.filter(${callback}).length > 0;`, `${values}.some(${callback});`],
				[`${values}.filter(${callback}).length !== 0;`, `${values}.some(${callback});`],
				[`${values}.findLastIndex(${callback}) !== -1;`, `${values}.some(${callback});`],
				[`${values}.findLastIndex(${callback}) === -1;`, `!${values}.some(${callback});`],
			]) {
				const result = linter.verifyAndFix(code, linterConfig);
				t.assert.strictEqual(result.output, output);
				t.assert.strictEqual(result.fixed, true);
				t.assert.deepStrictEqual(result.messages, []);
				t.assert.strictEqual(runInNewContext(output), runInNewContext(code));
			}
		}
	}
});

nodeTest('callbacks with side effects or unknown callbacks stay suggestions', t => {
	for (const [code, original, suggested] of [
		[
			'const calls = []; const found = [1, 2].filter(value => calls.push(value)).length > 0; JSON.stringify({found, calls});',
			'{"found":true,"calls":[1,2]}',
			'{"found":true,"calls":[1]}',
		],
		[
			'let count = 0; const found = [1, 2].filter(value => (count++, value > 0)).length > 0; JSON.stringify({found, count});',
			'{"found":true,"count":2}',
			'{"found":true,"count":1}',
		],
		[
			'const calls = []; const isPositive = value => calls.push(value); const found = [1, 2].filter(isPositive).length > 0; JSON.stringify({found, calls});',
			'{"found":true,"calls":[1,2]}',
			'{"found":true,"calls":[1]}',
		],
		[
			'const calls = []; const found = [1, 2].findLastIndex(value => calls.push(value)) !== -1; JSON.stringify({found, calls});',
			'{"found":true,"calls":[2]}',
			'{"found":true,"calls":[1]}',
		],
		[
			'const calls = []; const values = [1, 2].map(() => {}); const found = values.filter((value = calls.push("default")) => value > 0).length > 0; JSON.stringify({found, calls});',
			'{"found":true,"calls":["default","default"]}',
			'{"found":true,"calls":["default"]}',
		],
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.strictEqual(runInNewContext(code), original);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].fix, undefined);
		t.assert.strictEqual(messages[0].suggestions.length, 1);
		const {range, text} = messages[0].suggestions[0].fix;
		const suggestedCode = code.slice(0, range[0]) + text + code.slice(range[1]);
		t.assert.strictEqual(runInNewContext(suggestedCode), suggested);
	}
});

test({
	valid: [],
	invalid: [
		...[
			['(values.findLastIndex(predicate)) === -1;', '!(values.some(predicate));'],
			['values.findLastIndex(/* keep */ predicate) /* keep */ !== -1;', 'values.some(/* keep */ predicate) /* keep */;'],
			['values.findLastIndex(value => log(value)) !== -1;', 'values.some(value => log(value));'],
		].map(([code, suggestionOutput]) => invalidCase({
			code,
			suggestionOutput,
			method: 'findLastIndex',
		})),
		{
			code: 'const found = <div>{values.findLastIndex(value => value > 0) !== -1}</div>;',
			output: 'const found = <div>{values.some(value => value > 0)}</div>;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
			errors: 1,
		},
		{
			code: 'const values: number[] = [1, 2]; (values as number[]).findLastIndex((value: number) => value > 0) >= 0;',
			output: 'const values: number[] = [1, 2]; (values as number[]).some((value: number) => value > 0);',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'values.findLastIndex(predicate) !== /* keep */ -1;',
			errors: [{messageId: ERROR_ID_ARRAY_SOME, suggestions: 0}],
		},
		{
			code: 'values.findLastIndex(value => value > 0) !== /* keep */ -1;',
			errors: [{messageId: ERROR_ID_ARRAY_SOME, suggestions: []}],
		},
	],
});

test({
	valid: [],
	invalid: [
		...[
			['const found = ((values.filter(predicate)).length > 0);', 'const found = ((values.some(predicate)));'],
			['values.filter(/* keep */ predicate, receiver).length !== 0;', 'values.some(/* keep */ predicate, receiver);'],
			['values.filter(value => log(value)).length > 0;', 'values.some(value => log(value));'],
			['values.filter(value => (count++, value > 0)).length > 0;', 'values.some(value => (count++, value > 0));'],
			['values.filter(function (value) { seen.add(value); return value > 0; }).length > 0;', 'values.some(function (value) { seen.add(value); return value > 0; });'],
			['values.filter(async value => await check(value)).length > 0;', 'values.some(async value => await check(value));'],
		].map(([code, output]) => ({
			code,
			errors: [{messageId: 'filter', suggestions: [{messageId: SUGGESTION_ID_ARRAY_SOME, data: {method: 'filter'}, output}]}],
		})),
		{
			code: 'const found = <div>{values.filter(value => value > 0).length > 0}</div>;',
			output: 'const found = <div>{values.some(value => value > 0)}</div>;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
			errors: 1,
		},
		{
			code: 'const found = values.filter(function (value) { return value.id === id; }).length !== 0;',
			output: 'const found = values.some(function (value) { return value.id === id; });',
			errors: 1,
		},
		{
			code: 'const values: number[] = [1, 2]; (values as number[]).filter((value: number) => value > 0).length > 0;',
			output: 'const values: number[] = [1, 2]; (values as number[]).some((value: number) => value > 0);',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'values.filter(predicate).length /* keep */ > 0;',
			errors: [{messageId: 'filter', suggestions: 0}],
		},
		{
			code: 'values.filter(value => value > 0).length /* keep */ > 0;',
			errors: [{messageId: 'filter', suggestions: []}],
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

		// `switch` compares its discriminant with `===`, so the element itself is the value that gets compared, not a boolean
		'switch (foo.find(fn)) { case undefined: break; }',
		'switch (foo.findLast(fn)) { case undefined: break; }',
		'const found = foo.find(fn); switch (found) { case undefined: break; }',
		'foo([].find(fn));',
		'let found = [].find(fn); if (found) {}',
		'export const found = [].find(fn); if (found) {}',
		'const found = [].find(fn);',
		// The type and the value share one variable
		{
			code: 'const found = [].find(fn); type found = string; if (found) {}',
			languageOptions: {parser: parsers.typescript},
		},
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
		'array.filter().length > 0',
		'array.filter("foo").length > 0',
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
		// The second argument is the `thisArg`, `.some(…)` takes it too
		'foo.findIndex(bar, thisArgument) !== -1;',
		'foo.findLastIndex(bar, thisArgument) !== -1;',
	],
});

test.vue({
	valid: [
		...[
			'<template><div v-if="(() => { const found = values.find(predicate); return Boolean(found); })()"></div></template>',
			'<template><div v-if="(() => { const found = [].find(predicate); return Boolean(found); })()"></div></template>',
		].flatMap(code => [code, code.replace('.find(', '.findLast(')]),
		'<template><button @click="() => { const found = values.findLast(predicate); Boolean(found); }">Check</button></template>',
	],
	invalid: [
		invalidCase({
			code: '<script>const found = values.find(predicate); Boolean(found);</script>',
			suggestionOutput: '<script>const found = values.some(predicate); Boolean(found);</script>',
			method: 'find',
		}),
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
			errors: [{messageId: 'filter', suggestions: [{messageId: SUGGESTION_ID_ARRAY_SOME, data: {method: 'filter'}, output: '<template><div v-if="foo.some(fn)"></div></template>'}]}],
		},
		{
			code: '<template><div v-if="foo.filter(fn).length !== 0"></div></template>',
			errors: [{messageId: 'filter', suggestions: [{messageId: SUGGESTION_ID_ARRAY_SOME, data: {method: 'filter'}, output: '<template><div v-if="foo.some(fn)"></div></template>'}]}],
		},
		{
			code: '<script>foo.findIndex(fn) !== -1;</script>',
			output: '<script>foo.some(fn);</script>',
			errors: 1,
		},
		invalidCase({
			code: '<script>foo.findLastIndex(fn) !== -1;</script>',
			suggestionOutput: '<script>foo.some(fn);</script>',
			method: 'findLastIndex',
		}),
		{
			code: '<script>if (foo.filter(fn).length > 0);</script>',
			errors: [{messageId: 'filter', suggestions: [{messageId: SUGGESTION_ID_ARRAY_SOME, data: {method: 'filter'}, output: '<script>if (foo.some(fn));</script>'}]}],
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
		'foo.find(fn, thisArgument) !== undefined',
	],
});

// The space before the operator must not be left dangling
test({
	valid: [],
	invalid: [
		...[
			['foo.findIndex(fn) !== -1;', 'foo.some(fn);'],
			['foo.findIndex(fn) === -1;', '!foo.some(fn);'],
			['const a = foo.findIndex(fn) !== -1;', 'const a = foo.some(fn);'],
		].map(([code, output]) => ({code, output, errors: 1})),
		invalidCase({
			code: 'foo.findLastIndex(fn) !== -1;',
			suggestionOutput: 'foo.some(fn);',
			method: 'findLastIndex',
		}),
	],
});

// The parentheses around the call must survive, and the comment before the operator must too
test({
	valid: [],
	invalid: [
		...[
			['(foo.findIndex(fn)) !== -1;', '(foo.some(fn));'],
			['(foo.findIndex(fn) !== -1);', '(foo.some(fn));'],
			['foo.findIndex(fn) /* c */ !== -1;', 'foo.some(fn) /* c */;'],
			['const a = (foo.findIndex(fn)) !== -1;', 'const a = (foo.some(fn));'],
		].map(([code, output]) => ({code, output, errors: 1})),
	],
});

// The whole comparison is removed, the space before the operator goes with it
test({
	valid: [],
	invalid: [
		...[
			['foo.find(fn) === undefined;', '!foo.some(fn);', 'find'],
			['foo.find(fn) == null;', '!foo.some(fn);', 'find'],
			['foo.find(fn) !== undefined;', 'foo.some(fn);', 'find'],
			['foo.findLast(fn) === undefined;', '!foo.some(fn);', 'findLast'],
			['foo.find(fn)  ===  undefined;', '!foo.some(fn);', 'find'],
			['foo.find(fn)===undefined;', '!foo.some(fn);', 'find'],
			['(foo.find(fn)) === undefined;', '!(foo.some(fn));', 'find'],
			['foo.find(fn) === undefined && bar;', '!foo.some(fn) && bar;', 'find'],
			['a = (( ((foo.find(fn))) == ((null)) )) ? "no" : "yes";', 'a = (( !((foo.some(fn))) )) ? "no" : "yes";', 'find'],
		].map(([code, suggestionOutput, method]) => invalidCase({code, suggestionOutput, method})),
	],
});
