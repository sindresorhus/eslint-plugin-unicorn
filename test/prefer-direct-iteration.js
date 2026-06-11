import {fileURLToPath} from 'node:url';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);
const fixtureDirectory = fileURLToPath(new URL('fixtures/prefer-direct-iteration/', import.meta.url));

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
			tsconfigRootDir: fixtureDirectory,
			projectService: {
				allowDefaultProject: ['*.ts'],
				defaultProject: 'tsconfig.json',
			},
		},
	},
});

test.snapshot({
	valid: [
		// Already direct iteration
		'for (const item of array) {}',
		'[...array]',
		'call(...array)',
		'new Set(array)',
		'Array.from(array)',
		'Promise.all(array)',

		// Unknown receivers are intentionally ignored
		'for (const item of foo.entries()) {}',
		'[...foo.values()]',
		'new Map(foo.entries())',
		'Promise.all(foo.values())',

		// Non-equivalent built-in methods
		'for (const item of array.entries()) {}',
		'for (const item of map.values()) {}',
		'for (const item of map.keys()) {}',
		'for (const item of set.entries()) {}',
		'[...new Map().values()]',
		'[...new Map().keys()]',
		'[...new Set().entries()]',

		// Not a zero-argument direct method call
		'[...new Set().values(argument)]',
		'[...new Set().values?.()]',
		'[...(new Set())?.values()]',
		'[...new Set()["values"]()]',
		'[...new Set()[values]()]',

		// Not an iterable-consuming context
		'const iterator = array.values()',
		'function foo() { return array.values(); }',
		'foo(array.values())',
		'foo([1, 2].values())',
		'({...array.values()})',
		'({...new Set().values()})',

		// Multiple arguments
		'new Map(new Map().entries(), extra)',
		'Promise.all([promise].values(), extra)',

		// TypeScript annotations that are not supported default iterator matches
		typescript('for (const item of map.values()) {}'),
		typescript('for (const item of set.entries()) {}'),
		typescript('for (const item of foo.entries()) {}'),
		typescript('function foo(map: Map<string, string>) { return [...map.values()]; }'),
		typescript('function foo(set: Set<string>) { return [...set.entries()]; }'),
		typescript('function foo(iterable: string[] | Map<string, string>) { return [...iterable.values()]; }'),
		typescript('function foo(iterable: Map<string, string> | Set<string>) { return [...iterable.entries()]; }'),
	],
	invalid: [
		// Direct expressions
		'for (const item of [1, 2, 3].values()) {}',
		'for await (const item of new Set().values()) {}',
		'[...new Set().keys()]',
		'[...new Map().entries()]',
		'[...new URLSearchParams().entries()]',
		'[...new FormData().entries()]',
		'[...new Uint8Array().values()]',
		'call(...new Array().values())',
		'new Set(...new Array().values())',
		'new Map(new Map().entries())',
		'new WeakMap(new Map().entries())',
		'new WeakSet(new Set().values())',
		'new Set(Array.from(array).values())',
		'Array.from(Array.of(1, 2).values())',
		'Array.from([1, 2].values(), value => value * 2)',
		'new Uint8Array([1, 2].values())',
		'Uint8Array.from(new Uint8Array().values())',
		'Uint8Array.from([1, 2].values(), value => value * 2)',
		'Object.fromEntries(new Map().entries())',
		'Promise.all([promise].values())',
		'Promise.allSettled([promise].values())',
		'Promise.any([promise].values())',
		'Promise.race([promise].values())',
		outdent`
			function * foo() {
				yield * new Set().values();
			}
		`,

		// Const initialized receivers
		outdent`
			const map = new Map();
			for (const item of map.entries()) {}
		`,
		outdent`
			const array = [1, 2, 3];
			const set = new Set(array);
			Promise.all(set.values());
		`,
		outdent`
			const searchParameters = new URLSearchParams();
			Object.fromEntries(searchParameters.entries());
		`,

		// Parenthesized receivers
		'[...(new Set()).values()]',
		'[...((new Map()).entries())]',

		// TypeScript annotations and assertions
		typescript('function foo(array: string[]) { return [...array.values()]; }'),
		typescript('function foo(array: readonly string[]) { return [...array.values()]; }'),
		typescript('function foo(array: ReadonlyArray<string>) { return [...array.values()]; }'),
		typescript('function foo(array: [string, string]) { return [...array.values()]; }'),
		typescript('function foo(map: Map<string, string>) { return [...map.entries()]; }'),
		typescript('function foo(map: ReadonlyMap<string, string>) { return Object.fromEntries(map.entries()); }'),
		typescript('function foo(set: Set<string>) { return [...set.keys()]; }'),
		typescript('function foo(set: ReadonlySet<string>) { return [...set.values()]; }'),
		typescript('function foo(searchParameters: URLSearchParams) { return [...searchParameters.entries()]; }'),
		typescript('function foo(formData: FormData) { return [...formData.entries()]; }'),
		typescript('function foo(array: Uint8Array) { return [...array.values()]; }'),
		typescript('function foo(iterable: string[] | Set<string>) { return [...iterable.values()]; }'),
		typescript('function foo(iterable: Map<string, string> | URLSearchParams) { return [...iterable.entries()]; }'),
		typescript('const array = foo as string[]; const values = [...array.values()];'),
		typescript('const values = [...(foo satisfies string[]).values()];'),
		typescript('const values = [...(<string[]>foo).values()];'),
		typescript('const foo = [] as string[]; const values = [...foo!.values()];'),

		// Comment case reports without autofix
		'[...new Set().values(/* keep */)]',
	],
});

test.snapshot({
	valid: [
		// Mixed unions where the method is not equivalent for every branch
		typeAware('type Iterable = string[] | Map<string, string>; function foo(iterable: Iterable) { return [...iterable.values()]; }'),
		typeAware('type Iterable = Map<string, string> | Set<string>; function foo(iterable: Iterable) { return [...iterable.entries()]; }'),

		// Unclear types remain ignored
		typeAware('function foo(iterable: any) { return [...iterable.values()]; }'),
		typeAware('function foo(iterable: unknown) { return [...iterable.values()]; }'),
		typeAware('function foo(iterable) { return [...iterable.values()]; }'),

		// Userland types with matching method names are not built-ins
		typeAware('class Collection { values() { return [][Symbol.iterator](); } } const collection = new Collection(); [...collection.values()];'),
		typeAware('interface Collection { entries(): Iterable<[string, string]>; } declare const collection: Collection; [...collection.entries()];'),
		typeAware('export {}; class Map { entries() { return []; } } declare function getMap(): Map; const map = getMap(); [...map.entries()];'),
	],
	invalid: [
		typeAware('type Items = string[]; function foo(items: Items) { return [...items.values()]; }'),
		typeAware('type Items = readonly string[]; function foo(items: Items) { return [...items.values()]; }'),
		typeAware('type Pairs = Map<string, string>; declare const pairs: Pairs; Object.fromEntries(pairs.entries());'),
		typeAware('type Pairs = ReadonlyMap<string, string>; declare const pairs: Pairs; Object.fromEntries(pairs.entries());'),
		typeAware('type Values = ReadonlySet<string>; declare const values: Values; [...values.values()];'),
		typeAware('type Entries = Map<string, string> | URLSearchParams; function foo(entries: Entries) { return [...entries.entries()]; }'),
		typeAware('type Values = string[] | Set<string>; function foo(values: Values) { return [...values.values()]; }'),
		typeAware('type Bytes = Uint8Array; declare const bytes: Bytes; [...bytes.values()];'),
		typeAware('declare function getItems(): string[]; const items = getItems(); [...items.values()];'),
	],
});
