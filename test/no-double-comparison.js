import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Loose equality (`==`/`!=`) is not recognized, only strict equality.
		'x == y || x < y',
		'x == y || x > y',
		'x != y && x <= y',
		// Subsumption is out of scope.
		'x <= y || x < y',
		'x < y || x <= y',
		'x >= y || x > y',
		'x === y || x <= y',
		// Different operands.
		'x === y || x < z',
		'a === b || c < d',
		// Same operator on both sides.
		'x < y || x < y',
		'x === y || x === y',
		// `||` of two ordering checks that are not reducible to a single operator.
		'x <= y || x >= y',
		// Pure-relational flipped pair without an equality check is intentionally not flagged.
		'x < y || y > x',
		'x > y || y < x',
		// Flipped duplicate (`y >= x` is `x <= y`), not a reduction.
		'x <= y && y >= x',
		// Call expressions are not treated as the same operand, so nothing is combined.
		'f() === y || f() < y',
		'x === f() || x < f()',
		// Operator pairs that do not reduce.
		'x < y && x > y',
		'x <= y || x > y',
		// Equality paired with strict inequality is left alone (tautology / contradiction).
		'x === y || x !== y',
		'x === y && x !== y',
		// Only adjacent comparisons combine, so a reducible pair split by another operand is not flagged.
		'x === y || z || x < y',
		// Optional chaining is not reasoned about.
		'x?.a === y || x?.a < y',
		'x?.a <= y && x?.a >= y',
		// Not both comparisons.
		'x === y || foo(x, y)',
		'x === y || x',
		// Nullish coalescing is not a comparison join.
		'x === y ?? x < y',
	],
	invalid: [
		// `||` reductions.
		'x === y || x < y',
		'x < y || x === y',
		'x === y || x > y',
		'x > y || x === y',
		// `&&` reductions.
		'x <= y && x >= y',
		'x >= y && x <= y',
		'x <= y && x !== y',
		'x !== y && x <= y',
		'x >= y && x !== y',
		'x !== y && x >= y',
		// These are suggestions instead of autofixes because the reductions can change behavior for `NaN`, `undefined`, or `Symbol`.
		'x < y || x > y',
		'x > y || x < y',
		'undefined === undefined || undefined < undefined',
		'undefined <= undefined && undefined >= undefined',
		'const symbol = Symbol(); symbol === symbol || symbol < symbol',
		'const symbol = Symbol(); symbol <= symbol && symbol >= symbol',
		'null <= 0 && null !== 0',
		'null >= 0 && null !== 0',
		// Flipped operands.
		'x === y || y < x',
		'y < x || x === y',
		'x <= y && y <= x',
		// Flipped operands that also need a suggestion because an operand could trigger a getter.
		'a.b === c || c > a.b',
		// Member-expression operands could trigger a getter, so they downgrade to a suggestion.
		'x === 5 || x < 5',
		'a.b === c || a.b < c',
		'this.x === y || this.x > y',
		'a[b] === c || a[b] > c',
		// Nested in a longer chain: only the inner combinable pair is reported.
		'x === y || x < y || z',
		// A longer chain combines pairwise rather than collapsing: only the adjacent pair reduces.
		'x < y || x === y || x > y',
		// The combined comparison is the object of a member expression, so the wrapping parentheses are preserved.
		'(x === y || x < y).foo',
		// Used in a larger expression.
		'if (x === y || x < y) {}',
		'const result = x >= y && x !== y;',
		// Comment that would be dropped: reported without a fix.
		'x === y || /* keep */ x < y',
		'x === y || x /* keep */ < y',
		// Comment inside a reused operand is preserved, so the fix still applies.
		'(a /* keep */) === c || a < c',
		// Parentheses around the whole comparisons.
		'(x === y) || (x < y)',
		// TypeScript.
		{code: '(x as number) === y || (x as number) < y', languageOptions: {parser: parsers.typescript}},
		{code: 'x! === y || x! < y', languageOptions: {parser: parsers.typescript}},
		{code: '(x satisfies number) === y || (x satisfies number) < y', languageOptions: {parser: parsers.typescript}},
	],
});
