import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

const linter = new Linter();

const linterConfig = {
	plugins: {unicorn: {rules: {'no-redundant-comparison': rule}}},
	rules: {'unicorn/no-redundant-comparison': 'error'},
};

nodeTest('explicit side effects invalidate equality, disequality, and bound implications', t => {
	for (const code of [
		'let first = 1; let second = 1; first === second && first === 1 && (second = 2) === 2 && second === 1;',
		'let first = 1; let second = 1; first === second && first === 1 && second++ === 1 && second === 1;',
		'let first = 1; let second = 1; function change() { second = 2; return true; } first === second && first === 1 && change() && second === 1;',
		'let first = 1; let second = 1; function change() { second = 2; return true; } first === second && first === 1 && change`value` && second === 1;',
		'let first = 1; let second = 2; first === 1 && (first = 2) === 2 && second === 1 && first === second;',
		'let first = 1; let second = 2; first === 1 && first !== second && (second = 1) === 1 && second !== 1;',
		'let first = 1; let second = 1; first === second && first > 0 && (second = 0) === 0 && second > 0;',
		'let first = 1; let second = 1; let third = 1; first === second && second === third && first === 1 && (third = 2) === 2 && third === 1;',
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(runInNewContext(code), false);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(runInNewContext(output), false);
		t.assert.strictEqual(fixed, false);
		t.assert.deepStrictEqual(messages, []);
	}
});

nodeTest('pure strict comparisons retain autofixes', t => {
	for (const [code, expected] of [
		['const first = 1; const second = 1; first === second && first === 1 && second === 1;', 'const first = 1; const second = 1; first === second && first === 1;'],
		['const first = 1; const second = 2; first === 1 && first !== second && second !== 1;', 'const first = 1; const second = 2; first === 1 && first !== second;'],
		[
			'const first = 1; const second = 1; const third = 1; first === second && second === third && first === 1 && third === 1;',
			'const first = 1; const second = 1; const third = 1; first === second && second === third && first === 1;',
		],
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(output, expected);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(output), runInNewContext(code));
	}
});

nodeTest('implicit ordering coercion retains the existing suggestion', t => {
	const code = 'const first = 1; const second = 1; first === second && first > 0 && second > 0;';
	const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
	t.assert.strictEqual(output, code);
	t.assert.strictEqual(fixed, false);
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].fix, undefined);
	t.assert.strictEqual(messages[0].suggestions.length, 1);
	const {range, text} = messages[0].suggestions[0].fix;
	const suggestedCode = code.slice(0, range[0]) + text + code.slice(range[1]);
	t.assert.strictEqual(suggestedCode, 'const first = 1; const second = 1; first === second && first > 0;');
	t.assert.strictEqual(runInNewContext(suggestedCode), runInNewContext(code));
});

test({
	valid: [
		'first === second && first === 1 && /* keep */ change() && second === 1;',
		'((first === second) && (first === 1) && ((second = 2) === 2) && (second === 1));',
		'first === second && first === 1 && (condition ? change() : true) && second === 1;',
		'first === second && first === 1 && (second = third, true) && second === 1;',
		'first === second && first === 1 && delete object.value && second === 1;',
		'first === second && first === 1 && new SomeClass() && second === 1;',
		'first === second && first === 1 && (change`value` === true) && second === 1;',
		'first === second && first === 1 && (condition ? change`value` : true) && second === 1;',
		'first === second && first === 1 && (change`value`, true) && second === 1;',
		'first === second && first === 1 && /* keep */ ((change`value`)) && second === 1;',
		{
			code: 'let first = 1; let second = 1; (first as number) === second && first === 1 && ((second = 2) as number) === 2 && second === 1;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'first! === second && first === 1 && (change() satisfies boolean) && second === 1;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'first! === second && first === 1 && (change`value` satisfies boolean) && second === 1;',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		{
			code: 'first === second && first === 1 && /* keep */ second === 1;',
			errors: [{messageId: 'no-redundant-comparison'}],
		},
		{
			code: '(first === second) && (first === 1) && (second === 1);',
			output: '(first === second) && (first === 1);',
			errors: [{messageId: 'no-redundant-comparison'}],
		},
		{
			code: 'first === second && first === "value" && `value` && second === "value";',
			output: 'first === second && first === "value" && `value`;',
			errors: [{messageId: 'no-redundant-comparison'}],
		},
		{
			code: '((first as number) === second) && (first === 1) && (second! === 1);',
			output: '((first as number) === second) && (first === 1);',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'no-redundant-comparison'}],
		},
	],
});

test.snapshot({
	valid: [
		// Not a logical AND
		'a > 0 || b > 0 || a === b',
		'a > 0 ?? b > 0 ?? a === b',

		// Nothing to combine
		'a > 0',
		'a === b',
		'a > 0 && a === b',
		'a > 0 && b > 0',
		'a !== b',

		// Disequality with ordering predicates (no `=== k`/`!== k` pair)
		'a > 0 && b > 0 && a !== b',

		// Contradiction, not a redundancy (out of scope)
		'a > 0 && b < 0 && a === b',

		// Values do not match
		'a === "foo" && b !== "bar" && a !== b',
		'a !== "foo" && b !== "bar" && a === b',

		// Not comparisons
		'foo() && bar() && a === b',
		'a && b && a === b',

		// Only equality/disequality links
		'a === b && b === c && a === c',

		// Optional chaining is not safe to reason about
		'a?.x > 0 && b?.x > 0 && a?.x === b?.x',

		// Self comparison
		'a > 0 && a > 0 && a === a',

		// Different references
		'a > 0 && c > 0 && a === b',

		// Loose equality is not considered
		'a == 0 && b == 0 && a === b',

		// Call bounds may differ between evaluations
		'a > foo() && b > foo() && a === b',

		// Side effect between the analyzed comparisons
		'if (a === b && a !== \'x\' && isEnabled() && b !== \'x\') {}',

		// Opposite bounds do not imply each other
		'a > 0 && b < 10 && a === b',

		// Computed keys with calls are not treated as the same reference
		'a[f()] > 0 && b[f()] > 0 && a[f()] === b[f()]',
		'const modes = new Set([1]); modes.clear(); value === other && value > (modes.size ? 3 : 2) && other > 3;',
		'const modes = new Set([1]); modes.clear(); value === other && value > -(modes.size ? 2 : 3) && other > -2;',
		'const modes = new Set([1]); modes.clear(); value === other && value > ((modes.size && 3) || lowerBound) && other > 3;',
		'const object = {value: true}; Object.defineProperty(object, "value", {get() { return false; }}); value === other && value > (object.value ? 3 : lowerBound) && other > 3;',
		{
			code: 'const modes = new Set([1]); modes.clear(); value === other && value > ((modes.size ? 3 : 2) as number) && other > 3;',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		// The seven cases from the proposal
		'a > 0 && b > 0 && a === b',
		'a > 0 && b > 2 && a === b',
		'a < c && b < c && a === b',
		'a !== "test" && b !== "test" && a === b',
		'a === "test" && b === "test" && a === b',
		'a === "test" && b !== "test" && a !== b',
		'a !== "test" && b === "test" && a !== b',

		// Reversed operand order
		'b > 0 && a > 0 && a === b',

		// Numeric interval reasoning
		'a >= 5 && b > 0 && a === b',
		'a > 0 && b >= 5 && a === b',
		'a > 0 && b >= 0 && a === b',
		'a > -2 && b > 0 && a === b',
		'a < 10 && b < 100 && a === b',

		// Member and computed references
		'obj.x > 0 && obj.y > 0 && obj.x === obj.y',
		'a[key] > 0 && b[key] > 0 && a[key] === b[key]',

		// Extra unrelated operand
		'a > 0 && b > 0 && a === b && c > 0',

		// Side effects before the first or after the last analyzed comparison
		'if (a === b && a !== \'x\' && b !== \'x\' && isEnabled()) {}',
		'if (isEnabled() && a === b && a !== \'x\' && b !== \'x\') {}',
		'if (a === b && a !== \'x\' && b !== \'x\' && list.includes(a)) {}',

		// Transitive equality
		'a > 0 && c > 0 && a === b && b === c',

		// Operand order flipped (`0 < a`)
		'0 < a && 0 < b && a === b',

		// Bound is itself a shared reference
		'a > b && c > b && a === c',

		// Non-numeric bound, matched by identical value
		'a < "foo" && b < "foo" && a === b',

		// `this` member references
		'this.x > 0 && this.y > 0 && this.x === this.y',

		// Inner `&&` chain inside a `||`
		'(a > 0 && b > 0 && a === b) || c',

		// Multiline
		outdent`
			if (
				a > 0 &&
				b > 0 &&
				a === b
			) {}
		`,

		// Comment in the removed span disables the fix
		'a > 0 && /* keep */ b > 0 && a === b',

		// TypeScript
		{code: '(a as number) > 0 && (b as number) > 0 && a === b', languageOptions: {parser: parsers.typescript}},
		{code: 'a! > 0 && b! > 0 && a === b', languageOptions: {parser: parsers.typescript}},
		{code: '(a satisfies number) > 0 && (b satisfies number) > 0 && a === b', languageOptions: {parser: parsers.typescript}},

		// Equality value on the right side
		'a !== b && 1 === a && b !== 1',

		// Equality chains merged into one class
		'a === b && c === d && b === c && a > 5 && d > 3',
		'a === b && b === c && a === c && a > 5 && c > 3',
		'a === b && c === a && c > 5 && b > 3',

		// The later comparison implies the earlier one
		'a < 5 && b < 3 && a === b',
		'a <= 3 && b < 3 && a === b',
	],
});
