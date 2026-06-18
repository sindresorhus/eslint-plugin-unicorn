import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Non-identity values
		'x += 1;',
		'x -= 1;',
		'x *= 2;',
		'x /= 2;',
		'x **= 2;',
		'x += 0.5;',

		// Bitwise operators are intentional int32/uint32 coercion idioms
		'x |= 0;',
		'x ^= 0;',
		'x &= -1;',
		'x <<= 0;',
		'x >>= 0;',
		'x >>>= 0;',

		// `%= 1` is `x % 1` (fractional part), not a no-op
		'x %= 1;',

		// Logical assignment operators
		'x ||= 0;',
		'x &&= 1;',
		'x ??= 0;',

		// Plain assignment
		'x = 0;',
		'x = 1;',

		// BigInt is not a plain numeric literal
		'x += 0n;',
		'x -= 0n;',
		'x *= 1n;',

		// `-0`/`+0`/`+1` are `UnaryExpression`, not a `Literal`
		'x += -0;',
		'x -= -0;',
		'x *= +1;',
		'x /= +1;',

		// Non-literal right-hand side
		'x += y;',
		'x *= zero;',
		'x += foo();',

		// TypeScript: `0 as number` is a `TSAsExpression`, not a plain literal
		{code: 'x += 0 as number;', languageOptions: {parser: parsers.typescript}},
		{code: 'x *= (1 satisfies number);', languageOptions: {parser: parsers.typescript}},

		// Wrong identity for the operator (`*`/`**`/`/` identity is `1`, not `0`)
		'x *= 0;',
		'x /= 0;',
		'x **= 0;',
	],
	invalid: [
		// Each operator, statement context (remove suggestion)
		'x += 0;',
		'x -= 0;',
		'x *= 1;',
		'x /= 1;',
		'x **= 1;',

		// Float and hex forms of the identity value
		'x += 0.0;',
		'x /= 1.0;',
		'x *= 0x1;',
		'x -= 0e3;',

		// Member-expression left-hand side
		'obj.x += 0;',
		'this.count -= 0;',
		'foo.bar.baz *= 1;',

		// Value-used context (replace suggestion)
		'foo(x += 0);',
		'foo(obj.x += 0);',
		'const y = (x *= 1);',
		'function f() { return x -= 0; }',
		'a = x += 0;',
		'const f = () => x /= 1;',
		'(x += 0, y);',
		'for (let i = 0; i < n; i += 0) {}',

		// Indented statement inside a block
		'function f() {\n\tx += 0;\n}',

		// Statement directly inside a `switch` case (remove suggestion)
		'switch (x) {\n\tcase 1:\n\t\ty += 0;\n}',

		// Statement directly inside a class static block (remove suggestion)
		'class Foo {\n\tstatic {\n\t\tx += 0;\n\t}\n}',

		// Comment inside the assignment, so no suggestion is offered
		'x += /* keep */ 0;',
		'x /* keep */ *= 1;',

		// Trailing comment is outside the assignment, so the remove suggestion keeps it
		'x += 0; // keep',

		// TypeScript: a plain numeric literal on the right is still flagged
		{code: 'x += 0;', languageOptions: {parser: parsers.typescript}},
	],
});
