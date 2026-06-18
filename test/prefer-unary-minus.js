import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Other multipliers / divisors
		'x * 2;',
		'x / 2;',
		'x * -2;',
		'x / -2;',

		// Both operands are `-1`, nothing to simplify
		'-1 * -1;',
		'-1 / -1;',

		// Division is not commutative, `-1 / x` is not `-x` (regardless of operand complexity)
		'-1 / x;',
		'-1 / (a + b);',

		// BigInt is not matched (`-1n` is not the numeric literal `-1`)
		'x * -1n;',
		'x / -1n;',
		'-1n * x;',
		'-1n / x;',

		// Out of scope operators
		'x ** -1;',
		'x - 1;',
		'x + -1;',
		'x % -1;',
		'x & -1;',
	],
	invalid: [
		// Multiplication, value on either side
		'x * -1;',
		'-1 * x;',

		// Division
		'x / -1;',

		// Member / call / numeric-literal operands
		'a.b * -1;',
		'foo() * -1;',
		'5 * -1;',
		'-1 * 5;',

		// Optional chaining and tagged template operands
		'foo?.bar * -1;',
		'tag`str` * -1;',

		// Update expressions (prefix and postfix)
		'--x * -1;',
		'x++ * -1;',

		// Unary operands
		'-y * -1;',
		'+x * -1;',

		// Parenthesization of the operand
		'(a + b) * -1;',
		'-1 * (a + b);',
		'(a ? b : c) * -1;',
		'(a, b) * -1;',
		'(a = b) * -1;',
		'(a + b) / -1;',

		// Operand already parenthesized (redundant parens dropped)
		'(x) * -1;',

		// Required parentheses are preserved (must not become `-x ** 2`)
		'(x * -1) ** 2;',

		// Token merge: must not become `a--x`
		'a-x*-1;',
		'a - x * -1;',

		// ASI protection at statement start
		'foo\nx * -1;',

		// Preceded by a keyword
		'function f() { return x * -1; }',

		// Nested / chained
		'x * -1 * -1;',
		'a + b * -1;',

		// Comment inside the expression is reported but not autofixed
		'x /* c */ * -1;',

		// Trailing comment is outside the expression, so the fix still applies
		'x * -1 /* c */;',

		// TypeScript
		{code: '(x as number) * -1;', languageOptions: {parser: parsers.typescript}},
		{code: '-1 * (x as number);', languageOptions: {parser: parsers.typescript}},
		{code: 'x! * -1;', languageOptions: {parser: parsers.typescript}},
	],
});
