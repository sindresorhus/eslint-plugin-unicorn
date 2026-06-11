import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typescript = code => ({
	code,
	languageOptions: {
		parser: parsers.typescript,
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
		'({...array.values()})',

		// Multiple arguments
		'new Map(new Map().entries(), extra)',
		'Promise.all([promise].values(), extra)',

		// TypeScript annotations that are not supported default iterator matches
		typescript('for (const item of map.values()) {}'),
		typescript('for (const item of set.entries()) {}'),
		typescript('for (const item of foo.entries()) {}'),
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
		'new Set(Array.from(array).values())',
		'Array.from(Array.of(1, 2).values())',
		'new Uint8Array([1, 2].values())',
		'Uint8Array.from(new Uint8Array().values())',
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
		typescript('const array = foo as string[]; const values = [...array.values()];'),
		typescript('const values = [...(foo satisfies string[]).values()];'),
		typescript('const values = [...(<string[]>foo).values()];'),
		typescript('const foo = [] as string[]; const values = [...foo!.values()];'),

		// Comment case reports without autofix
		'[...new Set().values(/* keep */)]',
	],
});
