import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Identity operations
		'x * 1;',
		'x + 0;',
		'x - 0;',
		'x / 1;',

		// `prefer-math-trunc` territory, not this rule
		'x | 0;',
		'x ^ 0;',
		'x << 0;',
		'x >> 0;',

		// Non-erasing division (`x / 0` is `Infinity`/`NaN`)
		'x / 0;',

		// Out of scope operators
		'x % 0;',
		'0 % x;',
		'x ** 0;',
		'0 ** x;',

		// Out of scope: self-operations (a different category)
		'x - x;',
		'x ^ x;',

		// BigInt is not matched (`0n` is not the literal `0`)
		'0n & x;',
		'x & 0n;',
		'x * 0n;',

		// Unary `-0` is not a literal `0`
		'-0 * x;',
		'x * -0;',

		// Comparisons
		'x === 0;',
		'x !== 0;',
	],
	invalid: [
		// Multiplication by zero
		'x * 0;',
		'0 * x;',

		// Alternate `0` literal forms are matched (value, not token)
		'0.0 * x;',

		// Bitwise AND with zero
		'x & 0;',
		'0 & x;',

		// Zero divided by something
		'0 / x;',

		'const y = value * 0;',

		// Nested / parenthesized
		'a + b * 0;',
		'(a + b) * 0;',
		'(x) & 0;',

		// Side-effecting / non-static operands (reported, no suggestion)
		'foo.bar * 0;',
		'foo() * 0;',

		// Foldable via a constant binding resolved through scope (suggestion → `0`)
		'const a = 5;\na * 0;',

		// Foldable (reported with suggestion → `0`)
		'5 * 0;',
		'0 * 5;',
		'7 & 0;',
		'0 & 3;',
		'0 / 5;',

		// Reported, but no suggestion (`-0`)
		'-5 * 0;',
		'0 / -5;',

		// Reported, but no suggestion (`NaN`)
		'0 / 0;',

		// Comment inside a foldable expression (no suggestion, to keep the comment)
		'5 /* keep */ * 0;',

		// TypeScript
		{code: '(x as number) * 0;', languageOptions: {parser: parsers.typescript}},
		{code: 'x! & 0;', languageOptions: {parser: parsers.typescript}},
	],
});
