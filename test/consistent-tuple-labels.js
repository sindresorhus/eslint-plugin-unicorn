import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		// All labeled
		'type Foo = [a: string, b: number];',
		'type Foo = [a: string, b: number, c: boolean];',

		// None labeled
		'type Foo = [string, number];',
		'type Foo = [string, number, boolean];',

		// Fewer than two elements
		'type Foo = [];',
		'type Foo = [string];',
		'type Foo = [a: string];',

		// Optional labeled elements
		'type Foo = [a?: string, b?: number];',
		'type Foo = [a: string, b?: number];',

		// Optional unlabeled elements (all unlabeled)
		'type Foo = [string?, number?];',

		// Labeled rest element (counts as labeled)
		'type Foo = [a: string, ...b: number[]];',

		// Unlabeled rest element (all unlabeled)
		'type Foo = [string, ...number[]];',

		// Nested tuples are evaluated independently
		'type Foo = [[a: number, b: number]];',
		'type Foo = [a: [x: number], b: [y: number]];',

		// Not a tuple
		'type Foo = string[];',
		'type Foo = readonly string[];',
		'type Foo = {a: string; b: number};',
	],
	invalid: [
		'type Foo = [a: string, number];',
		'type Foo = [string, b: number];',
		'type Foo = [a: string, b: number, c: boolean, d];',
		'type Foo = [a: string, number, c: boolean];',

		// Multiple unlabeled elements are each reported
		'type Foo = [a: string, number, boolean];',

		// Optional unlabeled element mixed with a labeled one
		'type Foo = [a?: string, number?];',
		'type Foo = [string?, b: number];',

		// Mixed via a labeled rest element (the unlabeled head should be flagged)
		'type Foo = [string, ...rest: number[]];',

		// Labeled head with an unlabeled rest element
		'type Foo = [a: string, ...number[]];',

		// Optional combined with a missing label
		'type Foo = [a?: string, number];',

		// Readonly tuple
		'type Foo = readonly [a: string, number];',

		// Nested tuple is inconsistent on its own
		'type Foo = [[a: number, number]];',

		// Comments inside the tuple
		'type Foo = [a: string, /* unlabeled */ number];',
	],
});
