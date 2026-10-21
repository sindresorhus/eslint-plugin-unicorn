import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['a += a + getValue(/* keep */);', 'a += getValue(/* keep */);'],
		['a *= getValue(/* keep */) * a;', 'a *= getValue(/* keep */);'],
		['a += a + (condition ? /* keep */ first : second);', 'a += (condition ? /* keep */ first : second);'],
		['a += a + values[/* keep */ index];', 'a += values[/* keep */ index];'],
	].map(([code, output]) => ({code, errors: [{messageId: 'no-misrefactored-assignment/error', suggestions: [{messageId: 'no-misrefactored-assignment/suggestion', output}]}]})),
});

test({
	valid: [],
	invalid: [
		...[
			['a += a + (/* keep */ condition ? first : second);', 'a += (/* keep */ condition ? first : second);'],
			['a += a + getValue(\r\n  // keep\r\n);', 'a += getValue(\r\n  // keep\r\n);'],
		].map(([code, output]) => ({code, errors: [{messageId: 'no-misrefactored-assignment/error', suggestions: [{messageId: 'no-misrefactored-assignment/suggestion', output}]}]})),
		{
			code: 'a += a + (value as /* keep */ number);',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'no-misrefactored-assignment/error', suggestions: [{messageId: 'no-misrefactored-assignment/suggestion', output: 'a += (value as /* keep */ number);'}]}],
		},
		...[
			'a += (/* keep */ a) + value;',
			'a += a /* keep */ + value;',
			'a += a + (/* keep */ value);',
			'a += a + (value /* keep */);',
		].map(code => ({code, errors: [{messageId: 'no-misrefactored-assignment/error', suggestions: []}]})),
	],
});

nodeTest('commented kept operands evaluate once and behavior changes remain suggestions', t => {
	const linter = new Linter();
	const code = 'let value = 2; let evaluations = 0; function getValue() { evaluations++; return 3; } value += value + getValue(/* keep */); JSON.stringify({value, evaluations});';
	const {output, fixed, messages} = linter.verifyAndFix(code, {
		plugins: {unicorn: {rules: {'no-misrefactored-assignment': rule}}},
		rules: {'unicorn/no-misrefactored-assignment': 'error'},
	});
	t.assert.strictEqual(output, code);
	t.assert.strictEqual(fixed, false);
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].fix, undefined);
	t.assert.strictEqual(messages[0].suggestions?.length, 1);
	const {fix} = messages[0].suggestions[0];
	const suggested = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	t.assert.ok(suggested.includes('/* keep */'));
	t.assert.strictEqual(runInNewContext(code), '{"value":7,"evaluations":1}');
	t.assert.strictEqual(runInNewContext(suggested), '{"value":5,"evaluations":1}');
});

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

		// The kept operand must keep its parentheses, otherwise the replacement regroups the expression
		'a += a + (b, c);',
		'a += a + (b ? c : d);',
		'a += (b ? c : d) + a;',
		// The whole right-hand side is the assignment operand, so parentheses of a tighter operand are not needed
		'a *= a * (b + c);',
	],
});
