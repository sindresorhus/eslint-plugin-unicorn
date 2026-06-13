import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'array.with(index, value)',
		'array.with(0, value)',
		'array.with(1, value)',
		'array.with(+1, value)',
		'array.with(-0, value)',
		'array.with(-0.5, value)',
		'array.with(array.length - 1, value)',
		'array.with(otherArray.length, value)',
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
	],
});
