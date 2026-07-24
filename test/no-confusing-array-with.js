import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Known non-array receiver (type information)
		{
			code: 'function f(foo: Set<number>) { foo.with(-1, value); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(foo: {with(index: number, value: unknown): void}) { foo.with(-1, value); }',
			languageOptions: {parser: parsers.typescript},
		},
		// Any other constructed receiver is a known non-array, no type information needed
		'const foo = new Foo(); foo.with(-1, value);',
		'array.with(index, value)',
		'array.with(0, value)',
		'array.with(1, value)',
		'array.with(+1, value)',
		'array.with(-0, value)',
		'array.with(-0.5, value)',
		'array.with(array.length - 1, value)',
		'array.with(otherArray.length, value)',
		// Nested unary expressions resolve to a positive index.
		'array.with(- -1, value)',
		'array.with(-(-(1)), value)',
		'array.with(index)',
		'array.with(index, value, extra)',
		'array["with"](-1, value)',
		'array?.with(-1, value)',
		'array.with?.(-1, value)',
		'with_(-1, value)',
	],
	invalid: [
		'array.with(-1, value)',
		'array.with(-2, value)',
		'array.with(-1.5, value)',
		'array.with(- 1, value)',
		// Nested unary expressions resolve to a negative index.
		'array.with(- - -1, value)',
		'array.with(-(-(-1)), value)',
		'array.with(-1)',
		'array.with(-1, value, extra)',
		'array.with(array.length, value)',
		'array.with(array.length)',
		'array.with(array.length, value, extra)',
		'object.items.with(object.items.length, value)',
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'array.with(0 as const, value)',
		'array.with(<number>0, value)',
		'array.with(0!, value)',
		'array.with(0 satisfies number, value)',
	],
	invalid: [
		'array.with(-1 as const, value)',
		'array.with(<number>-1, value)',
		'array.with(-1!, value)',
		'array.with(-1 satisfies number, value)',
		'array.with(array.length as number, value)',
		'array.with(<number>array.length, value)',
		'array.with(array.length!, value)',
		'array.with(array.length satisfies number, value)',
		'array.with((array satisfies number[]).length, value)',
		'(array satisfies number[]).with(array.length, value)',
		'object.items.with((object satisfies {items: unknown[]}).items.length, value)',
		'(object satisfies {items: unknown[]}).items.with(object.items.length, value)',
		// A receiver that is known to be an array must still be reported
		'function f(foo: number[]) { foo.with(-1, value); }',
		// A typed array shares `Array#with()` and its negative-index handling, however it is spelled
		'function f(foo: Uint8Array) { foo.with(-1, value); }',
		'const foo = new Uint8Array(); foo.with(-1, value);',
		// A union is only skipped when every member is a known non-array, so one array member is enough to report
		'function f(foo: Uint8Array | number[]) { foo.with(-1, value); }',
		'function f(foo: number[] | Set<number>) { foo.with(-1, value); }',
	],
});
