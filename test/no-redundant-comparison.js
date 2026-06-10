import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Not a logical AND
		'a > 0 || b > 0 || a === b',
		'a > 0 ?? b > 0 ?? a === b',

		// Nothing to combine
		'a > 0',
		'a === b',
		'a > 0 && a === b',
		'a > 0 && b > 0',
		'a !== b',

		// Disequality with ordering predicates (no `=== k`/`!== k` pair)
		'a > 0 && b > 0 && a !== b',

		// Contradiction, not a redundancy (out of scope)
		'a > 0 && b < 0 && a === b',

		// Values do not match
		'a === "foo" && b !== "bar" && a !== b',
		'a !== "foo" && b !== "bar" && a === b',

		// Not comparisons
		'foo() && bar() && a === b',
		'a && b && a === b',

		// Only equality/disequality links
		'a === b && b === c && a === c',

		// Optional chaining is not safe to reason about
		'a?.x > 0 && b?.x > 0 && a?.x === b?.x',

		// Self comparison
		'a > 0 && a > 0 && a === a',

		// Different references
		'a > 0 && c > 0 && a === b',

		// Loose equality is not considered
		'a == 0 && b == 0 && a === b',

		// Call bounds may differ between evaluations
		'a > foo() && b > foo() && a === b',

		// Opposite bounds do not imply each other
		'a > 0 && b < 10 && a === b',

		// Computed keys with calls are not treated as the same reference
		'a[f()] > 0 && b[f()] > 0 && a[f()] === b[f()]',
	],
	invalid: [
		// The seven cases from the proposal
		'a > 0 && b > 0 && a === b',
		'a > 0 && b > 2 && a === b',
		'a < c && b < c && a === b',
		'a !== "test" && b !== "test" && a === b',
		'a === "test" && b === "test" && a === b',
		'a === "test" && b !== "test" && a !== b',
		'a !== "test" && b === "test" && a !== b',

		// Reversed operand order
		'b > 0 && a > 0 && a === b',

		// Numeric interval reasoning
		'a >= 5 && b > 0 && a === b',
		'a > 0 && b >= 5 && a === b',
		'a > 0 && b >= 0 && a === b',
		'a > -2 && b > 0 && a === b',
		'a < 10 && b < 100 && a === b',

		// Member and computed references
		'obj.x > 0 && obj.y > 0 && obj.x === obj.y',
		'a[key] > 0 && b[key] > 0 && a[key] === b[key]',

		// Extra unrelated operand
		'a > 0 && b > 0 && a === b && c > 0',

		// Transitive equality
		'a > 0 && c > 0 && a === b && b === c',

		// Operand order flipped (`0 < a`)
		'0 < a && 0 < b && a === b',

		// Bound is itself a shared reference
		'a > b && c > b && a === c',

		// Non-numeric bound, matched by identical value
		'a < "foo" && b < "foo" && a === b',

		// `this` member references
		'this.x > 0 && this.y > 0 && this.x === this.y',

		// Inner `&&` chain inside a `||`
		'(a > 0 && b > 0 && a === b) || c',

		// Multiline
		outdent`
			if (
				a > 0 &&
				b > 0 &&
				a === b
			) {}
		`,

		// Comment in the removed span disables the fix
		'a > 0 && /* keep */ b > 0 && a === b',

		// TypeScript
		{code: '(a as number) > 0 && (b as number) > 0 && a === b', languageOptions: {parser: parsers.typescript}},
		{code: 'a! > 0 && b! > 0 && a === b', languageOptions: {parser: parsers.typescript}},
		{code: '(a satisfies number) > 0 && (b satisfies number) > 0 && a === b', languageOptions: {parser: parsers.typescript}},
	],
});
