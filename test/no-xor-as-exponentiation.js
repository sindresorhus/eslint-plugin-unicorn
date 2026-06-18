import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Already correct
		'2 ** 32',
		// Non-decimal literals are likely intentional bitwise XOR
		'0xFF ^ 8',
		'2 ^ 0x10',
		'0b100 ^ 2',
		'0o20 ^ 2',
		'2 ^ 0o20',
		// Non-literal operands
		'a ^ b',
		'x ^ 2',
		'2 ^ y',
		'flags ^ MASK',
		// Floats
		'2.5 ^ 3',
		'2 ^ 3.5',
		'2e3 ^ 2',
		// BigInt
		'2n ^ 32n',
		// Unary operand is not a literal
		'2 ^ -3',
		'-2 ^ 3',
		'2 ^ +3',
		// Other operators
		'2 | 8',
		'2 & 8',
		'2 << 8',
		'2 ** 8',
		// TypeScript: operand is a `TSAsExpression`, not a literal
		{code: '(2 as number) ^ 8', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		'2 ^ 32',
		'3 ^ 3',
		'10 ^ 6',
		'0 ^ 0',
		'2 ^ 8',
		// Surrounding whitespace
		'2  ^  8',
		// Inside an expression
		'const x = 2 ^ 8;',
		'foo(2 ^ 8)',
		// Numeric separators are still decimal integers
		'10 ^ 1_000',
		// Nested: only the inner literal pair fires
		'2 ^ 8 ^ 2',
		// Comment between operands must be preserved
		'2 /* comment */ ^ 8',
		// TypeScript parser, plain literal pair still fires
		{code: '2 ^ 8', languageOptions: {parser: parsers.typescript}},
	],
});
