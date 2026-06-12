import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a > b',
		'a < b',
		'a === b',
		// Not a comparison
		'a - b',
		// Not compared with `0`
		'a - b > 1',
		'a - b > c',
		'a - b === c',
		// Not a subtraction
		'a + b > 0',
		'a * b > 0',
		'a % b > 0',
		// Neither side is a subtraction
		'a > 0',
		'0 > a',
		'0 > 0',
		// BigInt zero is excluded
		'a - b > 0n',
		// `-0` is a unary expression, not a `0` literal
		'a - b > -0',
		// Not one of the handled operators
		'a - b instanceof c',
	],
	invalid: [
		// The examples from the issue (bare identifiers → suggestion only)
		'if (a - b > 0) {}',
		'if (a - b >= 0) {}',
		'if (a - b < 0) {}',
		'if (a - b <= 0) {}',
		// Equality operators
		'a - b === 0',
		'a - b !== 0',
		'a - b == 0',
		'a - b != 0',
		// Zero on the left (operator flips for relational, stays for equality)
		'0 < a - b',
		'0 <= a - b',
		'0 > a - b',
		'0 >= a - b',
		'0 === a - b',
		'0 !== a - b',
		// Strict comparisons with numeric operands → autofix
		'1 - 2 > 0',
		'foo.length - bar.length > 0',
		'Number(a) - Number(b) < 0',
		'Number.POSITIVE_INFINITY - Number.POSITIVE_INFINITY > 0',
		// Non-strict comparisons with statically known finite numbers → autofix
		'1 - 2 >= 0',
		// Zero on the left with numeric operands → autofix with the operator flipped
		'0 < foo.length - bar.length',
		// Non-strict comparisons with non-finite numbers → suggestion
		'Number.POSITIVE_INFINITY - Number.POSITIVE_INFINITY >= 0',
		// Non-strict comparisons with non-static operands → suggestion
		'foo.length - bar.length >= 0',
		// Only one operand is provably numeric → suggestion, since both must be numbers
		'foo.length - bar > 0',
		// `Math.*` is recognized as numeric → autofix
		'Math.round(a) - Math.round(b) > 0',
		// Nested subtraction: `a - b - c > 0` → `a - b > c`
		'a.length - b.length - c > 0',
		// Parenthesized operands are preserved
		'(foo.length) - (bar.length) > 0',
		// The whole subtraction parenthesized
		'(a - b) > 0',
		// Optional chaining isn't provably numeric → suggestion
		'a?.b - c?.d > 0',
		// Comments inside → reported, no fix or suggestion
		'a - /* comment */ b > 0',
		// TypeScript numeric annotations → autofix
		{
			code: '(a as number) - (b as number) > 0',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
