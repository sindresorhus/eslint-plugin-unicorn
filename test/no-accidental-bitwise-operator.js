import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['ready && value | \'\';', 'ready && (value || \'\');'],
		['obj & obj.prop | fallback;', '(obj && obj.prop) | fallback;'],
		['value | \'\' ?? fallback;', '(value || \'\') ?? fallback;'],
		['fallback ?? value | \'\';', 'fallback ?? (value || \'\');'],
		['ready && (value | \'\');', 'ready && (value || \'\');'],
		['ready && value /* keep */ | \'\';', 'ready && (value /* keep */ || \'\');'],
		['(obj & obj.prop) === expected;', '(obj && obj.prop) === expected;'],
		['foo()\nobj & obj.prop | fallback', 'foo()\n;(obj && obj.prop) | fallback'],
		['foo()\nvalue | \'\' ?? fallback', 'foo()\n;(value || \'\') ?? fallback'],
		['if (ready)\nobj & obj.prop | fallback', 'if (ready)\n(obj && obj.prop) | fallback'],
	].map(([code, output]) => ({
		code,
		errors: [{
			messageId: 'no-accidental-bitwise-operator/error',
			suggestions: [{messageId: 'no-accidental-bitwise-operator/suggestion', output}],
		}],
	})),
});

test.snapshot({
	valid: [
		// Legitimate bitwise usage
		'a | b;',
		'a & b;',
		'flags & MASK;',
		'x | 0;',
		'x | 1;',
		'options | someVariable;',
		'a ^ b;',
		'a << b;',
		'a >> b;',
		'a >>> b;',
		'~x;',
		'x | (a + b);',
		'foo() | bar();',

		// `null` coerces to `0`, treated as numeric
		'x | null;',

		// BigInt supports bitwise operators (`5n | 2n`), so it is treated as numeric
		'x | 1n;',

		// A regex operand is not covered (rare, low-signal)
		'x | /regex/;',

		// Logical operators are already correct
		'a && b;',
		'a || b;',
		'obj && obj.prop;',

		// `&` only matches the same-identifier guard pattern
		'obj1 & obj2.a;',
		'obj.a & obj.b;',
		'obj & obj.a.b;',
		'a & b.c;',
		'this & this.a;',
		// Right side must be a member access on the same identifier
		'obj & obj;',
		'obj & obj.prop();',
		// Optional chaining wraps the member in a `ChainExpression`, so it is not matched
		'obj & obj?.a;',

		// `&=` is not handled
		'x &= {};',
		'x &= 1;',

		// Assignment with numeric/identifier right
		'x |= 1;',
		'x |= y;',

		// TypeScript: assertion-wrapped operands are not unwrapped
		{code: 'options | ({} as Foo);', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		// `&` short-circuit guard typo
		'obj & obj.a;',
		'if (obj & obj.prop) {}',
		'obj & obj[key];',
		'(obj) & obj.a;',
		'obj /* comment */ & obj.a;',

		// `|` fallback typo
		'options | {};',
		'options | \'\';',
		'options | true;',
		'options | [];',
		'options | `template`;',
		'x | function () {};',
		'x | (() => {});',
		'x | class {};',
		'foo() | {};',
		'a.b | {};',
		// Chained `|`: only the operator before the non-numeric operand is flagged
		'a | b | {};',

		// `|=` fallback typo
		'input |= \'\';',
		'input |= {};',
		'input |= false;',

		// TypeScript
		{code: 'obj & obj.a;', languageOptions: {parser: parsers.typescript}},
		{code: 'options | {};', languageOptions: {parser: parsers.typescript}},
	],
});

test({
	valid: [],
	invalid: [
		['ready || object & object.value;', 'ready || object && object.value;'],
		['ready && object & object.value;', 'ready && object && object.value;'],
		['value | \'\' || fallback;', 'value || \'\' || fallback;'],
	].map(([code, output]) => ({
		code,
		errors: [{
			messageId: 'no-accidental-bitwise-operator/error', suggestions: [{
				messageId: 'no-accidental-bitwise-operator/suggestion',
				output,
			}],
		}],
	})),
});
