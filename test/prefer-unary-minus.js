import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {transpileModule, ScriptTarget} from 'typescript';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['getObject(/* keep */).value * (-1)in object;', '-getObject(/* keep */).value in object;'],
		['getObject(/* keep */).value / (-1)instanceof Number;', '-getObject(/* keep */).value instanceof Number;'],
		['-1 * (getObject(/* keep */).value)in object;', '-getObject(/* keep */).value in object;'],
		['getObject(/* keep */).value * (-1)instanceof Number;', '-getObject(/* keep */).value instanceof Number;'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

nodeTest('unary minus fixes preserve trailing operator keywords and operand evaluation', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'prefer-unary-minus': rule}}},
		rules: {'unicorn/prefer-unary-minus': 'error'},
	};
	for (const expression of ['getObject(/* keep */).value * (-1)', 'getObject(/* keep */).value / (-1)', '-1 * (getObject(/* keep */).value)']) {
		for (const [operator, expected] of [['in object', true], ['instanceof Number', false]]) {
			const code = `${expression}${operator};`;
			const {fixed, output, messages} = linter.verifyAndFix(code, config);
			t.assert.strictEqual(fixed, true);
			t.assert.deepStrictEqual(messages, []);
			for (const source of [code, output]) {
				let calls = 0;
				const result = runInNewContext(source, {
					object: {'-3': true},
					getObject() {
						calls++;
						return {value: 3};
					},
				});
				t.assert.strictEqual(result, expected);
				t.assert.strictEqual(calls, 1);
			}
		}
	}
});

test({
	valid: [],
	invalid: [
		['getValue(/* keep */) * -1;', '-getValue(/* keep */);'],
		['-1 * values[/* keep */ index];', '-values[/* keep */ index];'],
		['(left + /* keep */ right) / -1;', '-(left + /* keep */ right);'],
		['(condition ? /* keep */ left : right) * -1;', '-(condition ? /* keep */ left : right);'],
		['getValue(\r\n  // keep\r\n) / -1;', '-getValue(\r\n  // keep\r\n);'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test({
	valid: [],
	invalid: [
		...[
			'(/* keep */ value) * -1;',
			'(value /* keep */) / -1;',
			'value * -/* keep */1;',
			'-1 /* keep */ * value;',
		].map(code => ({code, errors: 1})),
		{
			code: '(value as /* keep */ number) * -1;',
			output: '-(value as /* keep */ number);',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
	],
});

nodeTest('commented operands preserve numeric results and are evaluated once', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'prefer-unary-minus': rule}}},
		rules: {'unicorn/prefer-unary-minus': 'error'},
	};
	for (const code of ['getValue(/* keep */) * -1;', '-1 * getValue(/* keep */);', 'getValue(/* keep */) / -1;']) {
		const {output, messages, fixed} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.ok(output.includes('/* keep */'));
		for (const value of [0, -0, 3, -3, NaN, Infinity]) {
			const results = [code, output].map(source => {
				let evaluations = 0;
				const result = runInNewContext(source, {
					getValue() {
						evaluations++;
						return value;
					},
				});
				t.assert.strictEqual(evaluations, 1);
				return result;
			});
			t.assert.strictEqual(results[1], results[0]);
		}
	}
});

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

test({
	valid: [],
	invalid: [
		{
			code: 'value * -1 as any ** 2;', output: '(-value) as any ** 2;', errors: 1, languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(value * -1 as any) ** 2;', output: '((-value) as any) ** 2;', errors: 1, languageOptions: {parser: parsers.typescript},
		},
		...[
			['-1 * value satisfies number as any ** 2;', '(-value) satisfies number as any ** 2;'],
			['value / -1 as any ** 2;', '(-value) as any ** 2;'],
			['value * -1 as number;', '-value as number;'],
			['value * -1 satisfies number;', '-value satisfies number;'],
			['(value * -1) as number;', '(-value) as number;'],
		].map(([code, output]) => ({
			code, output, errors: 1, languageOptions: {parser: parsers.typescript},
		})),
		{
			code: 'value /* keep */ * -1 as any ** 2;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
	],
});

nodeTest('unary replacements remain valid after type assertions are erased before exponentiation', t => {
	const linter = new Linter();
	const config = {
		languageOptions: {parser: typescriptEslintParser},
		plugins: {unicorn: {rules: {'prefer-unary-minus': rule}}},
		rules: {'unicorn/prefer-unary-minus': 'error'},
	};
	const execute = source => {
		const {outputText, diagnostics} = transpileModule(source, {compilerOptions: {target: ScriptTarget.ESNext}, reportDiagnostics: true});
		t.assert.deepStrictEqual(diagnostics, []);
		t.assert.deepStrictEqual(linter.verify(outputText, {}), []);
		return runInNewContext(outputText, {value: 3});
	};

	for (const code of ['value * -1 as any ** 2;', '(value * -1 as any) ** 2;', '-1 * value satisfies number as any ** 2;', 'value / -1 as any ** 2;']) {
		const {output, messages, fixed} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(execute(output), execute(code));
	}
});
