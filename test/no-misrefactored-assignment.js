import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// No duplication
		'a += b;',
		'a += b + c;',
		'a -= b - c;',
		'a *= b * c;',

		// Operator mismatch
		'a += a - b;',
		'a -= a + b;',
		'a *= a + b;',
		'a /= a * b;',

		// Not a compound assignment we handle
		'a = a + b;',
		'a += a;',
		'a += b;',

		// Logical assignment operators are intentionally excluded
		'a &&= a && b;',
		'a ||= a || b;',
		'a ??= a ?? b;',

		// Non-commutative operators with the target as the right operand are allowed
		'a -= b - a;',
		'a /= b / a;',
		'a %= b % a;',
		'a **= b ** a;',
		'a <<= b << a;',
		'a >>= b >> a;',
		'a >>>= b >>> a;',

		// Different references
		'a.x += a.y + b;',
		'a[0] += a[1] + b;',
		'foo += bar + baz;',

		// Same property name but a different object
		'a.x += b.x + c;',

		// Computed key with a side effect cannot be proven equal, so it is not matched
		'a[foo()] += a[foo()] + b;',

		// Operator mismatch among bitwise operators
		'a |= a & b;',
		'a <<= a >> b;',

		// The target is not an immediate operand of the right-hand side
		'a += a + b + c;',
		'a += b + a + c;',
	],
	invalid: [
		// Left operand, every operator
		'a += a + b;',
		'a -= a - b;',
		'a *= a * b;',
		'a /= a / b;',
		'a %= a % b;',
		'a **= a ** b;',
		'a &= a & b;',
		'a |= a | b;',
		'a ^= a ^ b;',
		'a <<= a << b;',
		'a >>= a >> b;',
		'a >>>= a >>> b;',

		// Commutative operators, target as the right operand
		'a += b + a;',
		'a *= b * a;',
		'a &= b & a;',
		'a |= b | a;',
		'a ^= b ^ a;',

		// Member, `this`, and computed targets
		'foo.bar += foo.bar + 1;',
		'this.x += this.x + y;',
		'a.b[c] += a.b[c] + d;',

		// Dotted and computed-string member access to the same property match
		'a.x += a["x"] + b;',

		// Private class field target
		'class A { #x = 0; m() { this.#x += this.#x + b; } }',

		// Parentheses around the duplicated operand do not block matching
		'a += (a) + b;',

		// String concatenation is flagged too
		's += s + "!";',

		// Both operands equal the target
		'a += a + a;',

		// Nested assignments are reported independently
		'a += a + (b += b + c);',

		// Comments inside the right-hand side: reported, but no suggestion (would drop the comment)
		'a += a + /* keep */ b;',
		'a += /* lead */ a + b;',

		// Parenthesized kept operand
		'a += a + (b + c);',

		// Parenthesized right-hand side
		'a += (a + b);',

		// TypeScript: target matches a type-wrapped operand
		{
			code: 'a += (a as number) + b;',
			languageOptions: {parser: parsers.typescript},
		},

		// TypeScript: non-null assertion on the duplicated operand
		{
			code: 'a += a! + b;',
			languageOptions: {parser: parsers.typescript},
		},

		// TypeScript: angle-bracket type assertion on the duplicated operand
		{
			code: 'a += (<number>a) + b;',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
