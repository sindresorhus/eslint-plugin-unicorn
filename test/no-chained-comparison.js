import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Single comparison
		'a < b',
		'a === b',
		// Correct way to write a range check
		'a < b && b < c',
		'a < b && b < c && c < d',
		// Intentional comparison of two boolean results
		'(a > 0) === (b > 0)',
		'(a > 0) !== (b > 0)',
		'(a > 0) == (b > 0)',
		// Intentional comparison against a boolean literal
		'(a < b) === true',
		'(a < b) !== false',
		'(a < b) == true',
		'true === (a < b)',
		// Equality chain against a boolean literal is treated as an intentional boolean comparison
		'a == b == true',
		// Comparison result compared against another boolean value is intentional
		'(a > 0) !== Boolean(b)',
		'(a < b) === !c',
		'(a < b) === (c ? true : false)',
		// Sibling resolves through a binding to a boolean, so the comparison is intentional
		'const d = a > b; (a < b) === d;',
		// Not nested in another comparison
		'a < b || c < d',
		'!(a < b)',
		'foo(a < b, c)',
		'a < b ? c : d',
		'const x = a < b;',
		// Comparison results wrapped in calls are not directly nested
		'f(a < b) === g(c < d)',
		// Other binary operators are not comparisons
		'a instanceof b instanceof c',
		'a in b in c',
		'a + b + c',
		'(a < b) + c',
		'(a < b) & c',
		// Higher-precedence operand is not itself a comparison
		'typeof a < b',
		'a << b < c',
		// TypeScript
		{code: '(a as number) < b', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		// Ordering chains
		'a < b < c',
		'a > b > c',
		'a <= b <= c',
		'a >= b >= c',
		'a < b <= c',
		'a < b > c',
		// Equality chains
		'a == b == c',
		'a === b === c',
		'a != b != c',
		'a !== b !== c',
		// Mixed operators of the same kind still get a suggestion
		'a <= b >= c',
		'a === b !== c',
		// Explicit parentheses around the inner comparison do not change the bug
		'(a < b) < c',
		'(a == b) == c',
		// Range check with literal bounds keeps the suggestion
		'0 < x < 10',
		'min <= value <= max',
		// Unary-minus bound is not itself a comparison, so the suggestion stands
		'-1 < x < 1',
		// Member access middle operand keeps the suggestion (not a side effect)
		'a < b.c < d',
		'a < b[c] < d',
		'a < b?.c < d',
		// Higher-precedence middle operand is reused as-is, without extra parentheses
		'a < b + c < d',
		// Mixed ordering and equality have no plausible chain rewrite (no suggestion)
		'a < b === c',
		'a === b < c',
		// Comparison result compared against a value that is not provably boolean (no suggestion)
		'(a > 0) == 0',
		'(a > 0) === isEnabled',
		// Precedence-mixed, comparison nested on the right (no suggestion)
		'a == b < c',
		'a === b > c',
		// Side-effecting middle operand (no suggestion)
		'a < f() < c',
		'a < (b = c) < d',
		'a < b++ < c',
		// Comment inside (no suggestion)
		'a < /* comment */ b < c',
		// Ordering against a boolean literal is still nonsensical (no suggestion)
		'(a < b) < true',
		'a < b < false',
		// Ordering where both operands are comparisons (no suggestion)
		'(a < b) < (c < d)',
		// Deep chain reports at each level, but neither level has a clean `&&` rewrite (no suggestion)
		'a < b < c < d',
		// Chain nested in a higher-precedence operator: the `&&` rewrite would escape into the parent (no suggestion)
		'foo === a < b < c',
		'a < b < c === foo',
		'x & a < b < c',
		// Chain mixed with `??` would be a syntax error after the rewrite (no suggestion)
		'a ?? b < c < d',
		// Explicit parentheses keep the chain isolated, so the suggestion is safe
		'foo === (a < b < c)',
		// Logical and conditional parents bind looser than `&&`, so the suggestion stays correct
		'a && b < c < d',
		'a || b < c < d',
		'a < b < c ? x : y',
		// Reused operands keep their parentheses in the suggestion
		'a < (b ?? 0) < c',
		// TypeScript
		{code: 'a < b < c', languageOptions: {parser: parsers.typescript}},
		// TypeScript middle operands are preserved verbatim in the suggestion
		{code: 'a < b! < c', languageOptions: {parser: parsers.typescript}},
		{code: 'a < (b as number) < c', languageOptions: {parser: parsers.typescript}},
	],
});
