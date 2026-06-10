import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Already simple
		'array.sort((a, b) => a - b)',
		'array.sort((a, b) => b - a)',
		'array.sort((a, b) => a.foo - b.foo)',
		'array.sort((a, b) => a.localeCompare(b))',

		// Not a genuine bidirectional comparator
		'array.sort((a, b) => a > b ? 0 : -1)',
		'array.sort((a, b) => a > b ? 1 : 0)',
		'array.sort((a, b) => a > b ? 1 : 2)',

		// Branch direction does not match the relational test
		'array.sort((a, b) => a > b ? 1 : a < b ? 1 : -1)',
		outdent`
			array.sort((a, b) => {
				if (a > b) {
					return 1;
				}

				if (a < b) {
					return 1;
				}

				return -1;
			})
		`,

		// Optional chaining operands are not mirror-matched
		'array.sort((a, b) => a?.foo > b?.foo ? 1 : -1)',

		// Multi-key comparator in ternary form
		'array.sort((a, b) => a.foo > b.foo ? 1 : a.bar > b.bar ? -1 : 0)',

		// Multi-key comparator (different operand pairs)
		'array.sort((a, b) => a.foo - b.foo || a.bar - b.bar)',
		outdent`
			array.sort((a, b) => {
				if (a.foo > b.foo) {
					return 1;
				}

				if (a.foo < b.foo) {
					return -1;
				}

				if (a.bar > b.bar) {
					return 1;
				}

				if (a.bar < b.bar) {
					return -1;
				}

				return 0;
			})
		`,

		// `Math.random()` shuffle, operands are not parameter mirrors
		'array.sort(() => Math.random() > 0.5 ? 1 : -1)',
		'array.sort(() => Math.random() - 0.5)',

		// Not a parameter mirror
		'array.sort((a, b) => a > c ? 1 : -1)',
		'array.sort((a, b) => a.foo > b.bar ? 1 : -1)',
		'array.sort((a, b) => a > a ? 1 : -1)',

		// Computed member with a different subscript on each side
		'array.sort((a, b) => a[i] > b[j] ? 1 : -1)',

		// Returns non-numeric values
		'array.sort((a, b) => a > b ? "a" : "b")',
		'array.sort((a, b) => a > b ? foo : bar)',
		outdent`
			array.sort((a, b) => {
				doSomething();
				return a > b ? 1 : -1;
			})
		`,

		// Not a comparison at all
		'array.sort((a, b) => a + b)',
		'array.sort((a, b) => a === b ? 0 : 1)',

		// Wrong shape
		'array.sort()',
		'array.sort(compare)',
		'array.sort((a, b, c) => a > b ? 1 : -1)',
		'array.sort(a => a > 0 ? 1 : -1)',
		'array.sort(async (a, b) => a > b ? 1 : -1)',
		'array.sort(function * (a, b) { return a > b ? 1 : -1; })',
		'array.sort(([a], [b]) => a > b ? 1 : -1)',
		'array.sort((a, b) => a > b ? 1 : -1, extraArgument)',
		'array.notSort((a, b) => a > b ? 1 : -1)',
	],
	invalid: [
		// Single ternary
		'array.sort((a, b) => a > b ? 1 : -1)',
		'array.sort((a, b) => a < b ? -1 : 1)',

		// Swapped parameter order in the test
		'array.sort((a, b) => b > a ? 1 : -1)',

		// Descending
		'array.sort((a, b) => a > b ? -1 : 1)',
		'array.sort((a, b) => a < b ? 1 : -1)',

		// Nested ternary
		'array.sort((a, b) => a > b ? 1 : a < b ? -1 : 0)',
		'array.sort((a, b) => a < b ? -1 : a > b ? 1 : 0)',

		// `>=` / `<=`, both directions
		'array.sort((a, b) => a >= b ? 1 : -1)',
		'array.sort((a, b) => a <= b ? -1 : 1)',
		'array.sort((a, b) => a >= b ? -1 : 1)',

		// Two-branch `if` (no explicit equality case)
		outdent`
			array.sort((a, b) => {
				if (a > b) {
					return 1;
				}

				return -1;
			})
		`,

		// Member operands
		'array.sort((a, b) => a.foo > b.foo ? 1 : -1)',
		'array.sort((a, b) => a[0] > b[0] ? 1 : -1)',
		'array.sort((a, b) => a[i] > b[i] ? 1 : -1)',
		'array.sort((a, b) => a.foo.bar < b.foo.bar ? -1 : 1)',

		// Signed numeric-literal leaf with an explicit `+`
		'array.sort((a, b) => a > b ? +1 : -1)',

		// Block body, if/return chain
		outdent`
			array.sort((a, b) => {
				if (a > b) {
					return 1;
				}

				if (a < b) {
					return -1;
				}

				return 0;
			})
		`,
		// Block body, descending
		outdent`
			array.sort((a, b) => {
				if (a > b) {
					return -1;
				}

				if (a < b) {
					return 1;
				}

				return 0;
			})
		`,
		// If/else if/else
		outdent`
			array.sort((a, b) => {
				if (a > b) {
					return 1;
				} else if (a < b) {
					return -1;
				} else {
					return 0;
				}
			})
		`,

		// `function` expression
		'array.sort(function (a, b) { return a > b ? 1 : -1; })',

		// `toSorted`
		'array.toSorted((a, b) => a > b ? 1 : -1)',

		// Parenthesized operands
		'array.sort((a, b) => (a) > (b) ? 1 : -1)',

		// Comments inside, report without suggestion
		outdent`
			array.sort((a, b) => {
				// Compare
				return a > b ? 1 : -1;
			})
		`,

		// TypeScript
		{
			code: 'array.sort((a: number, b: number): number => a > b ? 1 : -1)',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
