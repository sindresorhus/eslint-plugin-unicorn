import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['function f() {return(0) < Number(read(/* keep */)) - Number(other);}', 'function f() {return Number(read(/* keep */)) > Number(other);}'],
		['function f() {throw(0) < Number(read(/* keep */)) - Number(other);}', 'function f() {throw Number(read(/* keep */)) > Number(other);}'],
		['function* f() {yield(0) < Number(read(/* keep */)) - Number(other);}', 'function* f() {yield Number(read(/* keep */)) > Number(other);}'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test({
	valid: [],
	invalid: [{
		code: 'function f() {return(0) < read(/* keep */) - other;}',
		errors: [{
			messageId: 'no-subtraction-comparison/error',
			suggestions: [{messageId: 'no-subtraction-comparison/suggestion', output: 'function f() {return read(/* keep */) > other;}'}],
		}],
	}],
});

test({
	valid: [],
	invalid: [
		...[
			['((1 /* keep */ + 2) - 4) > 0;', '(1 /* keep */ + 2) > 4;'],
			['(5 - (1 /* keep */ + 2)) === 0;', '5 === (1 /* keep */ + 2);'],
		].map(([code, output]) => ({code, output, errors: 1})),
		...[
			['(left[/* keep */ key] - right) > 0;', 'left[/* keep */ key] > right;'],
			['0 < (left - getRight(/* keep */));', 'left > getRight(/* keep */);'],
		].map(([code, output]) => ({
			code,
			errors: [{messageId: 'no-subtraction-comparison/error', suggestions: [{messageId: 'no-subtraction-comparison/suggestion', output}]}],
		})),
	],
});

test({
	valid: [],
	invalid: [
		...[
			['((/* keep */ 1)) - 2 > 0;', '((/* keep */ 1)) > 2;'],
			['0 < 1 - (2 /* keep */);', '1 > (2 /* keep */);'],
			['0 < (1\r\n  // keep\r\n) - 2;', '(1\r\n  // keep\r\n) > 2;'],
		].map(([code, output]) => ({code, output, errors: 1})),
		{
			code: 'setup()\n0 < (left as /* keep */ number) - (right as number);',
			output: 'setup()\n;(left as /* keep */ number) > (right as number);',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		...[
			'1 /* keep */ - 2 > 0;',
			'1 - /* keep */ 2 > 0;',
			'(/* keep */ 1 - 2) > 0;',
			'1 - 2 /* keep */ > 0;',
			'1 - 2 > (/* keep */ 0);',
		].map(code => ({code, errors: [{messageId: 'no-subtraction-comparison/error', suggestions: []}]})),
	],
});

const linter = new Linter();
const linterConfig = {
	plugins: {unicorn: {rules: {'no-subtraction-comparison': rule}}},
	rules: {'unicorn/no-subtraction-comparison': 'error'},
};

nodeTest('subtraction comparison edits preserve compact return behavior', t => {
	for (const [expression, canFix] of [
		['Number(read(/* keep */)) - Number(other)', true],
		['read(/* keep */) - other', false],
	]) {
		const code = `function compare() {return(0) < ${expression};} compare();`;
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(fixed, canFix);
		t.assert.strictEqual(messages.length, canFix ? 0 : 1);
		let corrected = output;
		if (!canFix) {
			t.assert.strictEqual(output, code);
			t.assert.strictEqual(messages[0].suggestions.length, 1);
			const {fix} = messages[0].suggestions[0];
			corrected = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		}

		for (const source of [code, corrected]) {
			t.assert.strictEqual(runInNewContext(source, {read: () => 5, other: 3}), true);
		}
	}
});

nodeTest('numeric comparisons preserve comments, results, and operand evaluation order', t => {
	for (const expression of [
		'Number(read("left", left) /* keep */) - Number(read("right", right)) > 0',
		'0 > Number(read("left", left)) - Number(read("right", right) /* keep */)',
	]) {
		for (const [left, right] of [[5, 3], [3, 5], [3, 3], [Infinity, Infinity]]) {
			const setup = `const left = ${left}; const right = ${right}; const calls = []; function read(name, value) { calls.push(name); return value; }`;
			const code = `${setup} const result = ${expression}; JSON.stringify({result, calls});`;
			const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
			t.assert.strictEqual(fixed, true);
			t.assert.deepStrictEqual(messages, []);
			t.assert.ok(output.includes('/* keep */'));
			t.assert.strictEqual(runInNewContext(output), runInNewContext(code));
			t.assert.deepStrictEqual(JSON.parse(runInNewContext(output)).calls, ['left', 'right']);
		}
	}
});

nodeTest('commented string and non-finite comparisons remain suggestions', t => {
	for (const [code, originalResult, suggestedResult] of [
		['("1" /* keep */ + "0") - "5" > 0;', true, false],
		['Number./* keep */POSITIVE_INFINITY - Number.POSITIVE_INFINITY >= 0;', false, true],
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].fix, undefined);
		t.assert.strictEqual(messages[0].suggestions?.length, 1);
		const {fix} = messages[0].suggestions[0];
		const suggested = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		t.assert.ok(suggested.includes('/* keep */'));
		t.assert.strictEqual(runInNewContext(code), originalResult);
		t.assert.strictEqual(runInNewContext(suggested), suggestedResult);
	}
});

test({
	valid: [],
	invalid: [
		...[
			['foo()\n0 < (1) - 2', 'foo()\n;(1) > 2'],
			['const previous = value\n0 > (1) - 2', 'const previous = value\n;(1) < 2'],
			['foo() // keep\n0 === (1) - 2', 'foo() // keep\n;(1) === 2'],
			['foo();\n0 < (1) - 2', 'foo();\n(1) > 2'],
			['if (ready)\n0 < (1) - 2', 'if (ready)\n(1) > 2'],
		].map(([code, output]) => ({code, output, errors: 1})),
		{
			code: 'foo()\n0 < (a as number) - (b as number)',
			output: 'foo()\n;(a as number) > (b as number)',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'foo()\n0 < (a) - b',
			errors: [{
				messageId: 'no-subtraction-comparison/error',
				suggestions: [{messageId: 'no-subtraction-comparison/suggestion', output: 'foo()\n;(a) > b'}],
			}],
		},
	],
});

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
		'1 - 1 === 0',
		// Zero on the left with numeric operands → autofix with the operator flipped
		'0 < foo.length - bar.length',
		// Non-strict comparisons with non-finite numbers → suggestion
		'Number.POSITIVE_INFINITY - Number.POSITIVE_INFINITY >= 0',
		'Number.POSITIVE_INFINITY - Number.POSITIVE_INFINITY === 0',
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
		'const modes = new Set([\'foo\']); modes.clear(); (modes.size ? 1 : \'x\') - (modes.size ? 1 : \'x\') === 0',
		'const modes = new Set([\'foo\']); modes.clear(); ((modes.size && 1) || value) - 1 === 0',
		'const object = {value: true}; Object.defineProperty(object, \'value\', {get() { return false; }}); (object.value ? 1 : value) - 1 === 0',
		{
			code: 'const modes = new Set([\'foo\']); modes.clear(); ((modes.size ? 1 : value) as number) - 1 === 0',
			languageOptions: {parser: parsers.typescript},
		},
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

test({
	valid: [],
	invalid: [
		{
			code: 'const alias = condition; var condition = true; (alias ? 1 : value) - 1 === 0',
			errors: [{messageId: 'no-subtraction-comparison/error', suggestions: 1}],
		},
	],
});

test({
	valid: [],
	invalid: [{
		code: '({value: 1}.value - other) > 0;',
		errors: [{
			messageId: 'no-subtraction-comparison/error', suggestions: [{
				messageId: 'no-subtraction-comparison/suggestion',
				output: '({value: 1}.value > other);',
			}],
		}],
	}, ...[
		['(function () {}.length - other) > 0;', '(function () {}.length > other);'],
		['const result = ({value: 1}.value - other) > 0;', 'const result = {value: 1}.value > other;'],
		['function check() { return ({value: 1}.value - other) > 0; }', 'function check() { return {value: 1}.value > other; }'],
		['(({value: 1}.value - other) > 0);', '({value: 1}.value > other);'],
		['({value: 1}.value) - other > 0;', '({value: 1}.value) > other;'],
	].map(([code, output]) => ({
		code,
		errors: [{messageId: 'no-subtraction-comparison/error', suggestions: [{messageId: 'no-subtraction-comparison/suggestion', output}]}],
	}))],
});
