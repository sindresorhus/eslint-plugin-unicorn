import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['read(/* keep */) < middle < last;', 'read(/* keep */) < middle && middle < last'],
		['first < middle < (/* keep */ last);', 'first < middle && middle < (/* keep */ last)'],
	].map(([code, replacement]) => ({
		code,
		errors: [{messageId: 'no-chained-comparison/error', suggestions: [{messageId: 'no-chained-comparison/suggestion', data: {replacement}, output: `${replacement};`}]}],
	})),
});

test({
	valid: [],
	invalid: [
		...[
			['(/* keep */ first) < middle < last;', '(/* keep */ first) < middle && middle < last'],
			['read(// keep\r\n) < middle < last;', 'read(// keep\r\n) < middle && middle < last'],
			['first < middle < ((last /* keep */));', 'first < middle && middle < ((last /* keep */))'],
		].map(([code, replacement]) => ({
			code,
			errors: [{messageId: 'no-chained-comparison/error', suggestions: [{messageId: 'no-chained-comparison/suggestion', data: {replacement}, output: `${replacement};`}]}],
		})),
		{
			code: '(first as /* keep */ number) < middle < last;',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'no-chained-comparison/error', suggestions: [{messageId: 'no-chained-comparison/suggestion', output: '(first as /* keep */ number) < middle && middle < last;'}]}],
		},
		...[
			'first < (middle /* duplicate */) < last;',
			'(/* discard */ first < middle) < last;',
			'(first < middle /* discard */) < last;',
		].map(code => ({code, errors: [{messageId: 'no-chained-comparison/error', suggestions: []}]})),
	],
});

nodeTest('comment-preserving chained comparison rewrites remain suggestions and evaluate the first operand once', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'no-chained-comparison': rule}}},
		rules: {'unicorn/no-chained-comparison': 'error'},
	};
	const code = 'read(/* keep */) < middle < last;';
	const {output, fixed, messages} = linter.verifyAndFix(code, config);
	t.assert.strictEqual(output, code);
	t.assert.strictEqual(fixed, false);
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].fix, undefined);
	t.assert.strictEqual(messages[0].suggestions?.length, 1);
	const {range, text} = messages[0].suggestions[0].fix;
	const suggested = code.slice(0, range[0]) + text + code.slice(range[1]);
	t.assert.strictEqual(suggested, 'read(/* keep */) < middle && middle < last;');
	t.assert.deepStrictEqual(linter.verify(suggested, config), []);
	for (const first of [0, 5]) {
		for (const source of [code, suggested]) {
			let calls = 0;
			const result = runInNewContext(source, {
				middle: 2,
				last: 4,
				read() {
					calls++;
					return first;
				},
			});
			t.assert.strictEqual(calls, 1);
			t.assert.strictEqual(result, source === code || first === 0);
		}
	}
});

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			'/** @param {boolean} flag */ function run(flag) { return (a < b) === flag; }',
			'/** @param {() => boolean} read */ function run(read) { return (a < b) !== read(); }',
			'/** @param {string} text */ function run(text) { return (a < b) == text.startsWith("x"); }',
			'/** @param {Array<number> | Uint8Array} values */ function run(values) { return values.some(predicate) === (a < b); }',
			'/** @returns {RegExp} */ function read() { return source; } (a < b) === read().global;',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [
			'/** @param {boolean | undefined} flag */ function run(flag) { return (a < b) === flag; }',
			'/** @param {boolean} [flag] */ function run(flag) { return (a < b) === flag; }',
			'/** @param {() => (() => boolean)} read */ function run(read) { return (a < b) !== read(); }',
		].map(code => ({code, filename: 'file.ts', errors: [{messageId: 'no-chained-comparison/error', suggestions: 0}]})),
	});
}

for (const parserOptions of [{}, {projectService: {allowDefaultProject: ['*.ts']}}]) {
	test({
		testerOptions: {languageOptions: {parser: typescriptEslintParser, parserOptions}},
		valid: [{code: '/** @param {string} flag */ function run(flag: boolean) { return (a < b) === flag; }', filename: 'file.ts'}],
		invalid: [{
			code: '/** @param {boolean} flag */ function run(flag: string) { return (a < b) === flag; }',
			filename: 'file.ts',
			errors: [{messageId: 'no-chained-comparison/error', suggestions: 0}],
		}],
	});
}

test({
	valid: [],
	invalid: ['as boolean', 'satisfies boolean'].flatMap(wrapper => [
		{
			code: `a < b < c ${wrapper}`,
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'no-chained-comparison/error', suggestions: []}],
		},
		{
			code: `(a < b < c) ${wrapper}`,
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'no-chained-comparison/error',
				suggestions: [{
					messageId: 'no-chained-comparison/suggestion',
					output: `(a < b && b < c) ${wrapper}`,
				}],
			}],
		},
	]),
});

test.snapshot({
	valid: [
		// Single comparison
		'a < b',
		'a === b',
		// Correct way to write a range check
		'a < b && b < c',
		'a < b && b < c && c < d',
		// Intentional comparison of two boolean results
		'(a > 0) === (b > 0)',
		'(a > 0) !== (b > 0)',
		'(a > 0) == (b > 0)',
		// Intentional comparison against a boolean literal
		'(a < b) === true',
		'(a < b) !== false',
		'(a < b) == true',
		'true === (a < b)',
		// Equality chain against a boolean literal is treated as an intentional boolean comparison
		'a == b == true',
		// Comparison result compared against another boolean value is intentional
		'(a > 0) !== Boolean(b)',
		'(a < b) === !c',
		'(a < b) === (c ? true : false)',
		// Sibling resolves through a binding to a boolean, so the comparison is intentional
		'const d = a > b; (a < b) === d;',
		// Not nested in another comparison
		'a < b || c < d',
		'!(a < b)',
		'foo(a < b, c)',
		'a < b ? c : d',
		'const x = a < b;',
		// Comparison results wrapped in calls are not directly nested
		'f(a < b) === g(c < d)',
		// Other binary operators are not comparisons
		'a instanceof b instanceof c',
		'a in b in c',
		'a + b + c',
		'(a < b) + c',
		'(a < b) & c',
		// Higher-precedence operand is not itself a comparison
		'typeof a < b',
		'a << b < c',
		// TypeScript
		{code: '(a as number) < b', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		// Ordering chains
		'a < b < c',
		'a > b > c',
		'a <= b <= c',
		'a >= b >= c',
		'a < b <= c',
		'a < b > c',
		// Equality chains
		'a == b == c',
		'a === b === c',
		'a != b != c',
		'a !== b !== c',
		// Mixed operators of the same kind still get a suggestion
		'a <= b >= c',
		'a === b !== c',
		// Explicit parentheses around the inner comparison do not change the bug
		'(a < b) < c',
		'(a == b) == c',
		// Range check with literal bounds keeps the suggestion
		'0 < x < 10',
		'min <= value <= max',
		// Unary-minus bound is not itself a comparison, so the suggestion stands
		'-1 < x < 1',
		// Member access middle operand keeps the suggestion (not a side effect)
		'a < b.c < d',
		'a < b[c] < d',
		'a < b?.c < d',
		// Higher-precedence middle operand is reused as-is, without extra parentheses
		'a < b + c < d',
		// Mixed ordering and equality have no plausible chain rewrite (no suggestion)
		'a < b === c',
		'a === b < c',
		// Comparison result compared against a value that is not provably boolean (no suggestion)
		'(a > 0) == 0',
		'(a > 0) === isEnabled',
		// Precedence-mixed, comparison nested on the right (no suggestion)
		'a == b < c',
		'a === b > c',
		// Side-effecting middle operand (no suggestion)
		'a < f() < c',
		'a < (b = c) < d',
		'a < b++ < c',
		// Comment inside (no suggestion)
		'a < /* comment */ b < c',
		// Ordering against a boolean literal is still nonsensical (no suggestion)
		'(a < b) < true',
		'a < b < false',
		// Ordering where both operands are comparisons (no suggestion)
		'(a < b) < (c < d)',
		// Deep chain reports at each level, but neither level has a clean `&&` rewrite (no suggestion)
		'a < b < c < d',
		// Chain nested in a higher-precedence operator: the `&&` rewrite would escape into the parent (no suggestion)
		'foo === a < b < c',
		'a < b < c === foo',
		'x & a < b < c',
		// Chain mixed with `??` would be a syntax error after the rewrite (no suggestion)
		'a ?? b < c < d',
		// Explicit parentheses keep the chain isolated, so the suggestion is safe
		'foo === (a < b < c)',
		// Logical and conditional parents bind looser than `&&`, so the suggestion stays correct
		'a && b < c < d',
		'a || b < c < d',
		'a < b < c ? x : y',
		// Reused operands keep their parentheses in the suggestion
		'a < (b ?? 0) < c',
		// TypeScript
		{code: 'a < b < c', languageOptions: {parser: parsers.typescript}},
		// TypeScript middle operands are preserved verbatim in the suggestion
		{code: 'a < b! < c', languageOptions: {parser: parsers.typescript}},
		{code: 'a < (b as number) < c', languageOptions: {parser: parsers.typescript}},
	],
});

test({
	valid: [],
	invalid: [{
		code: '({value: 1}.value < b) < c;',
		errors: [{messageId: 'no-chained-comparison/error', suggestions: [{messageId: 'no-chained-comparison/suggestion', output: '({value: 1}.value < b && b < c);'}]}],
	}, ...[
		['(function () {}.length < b) < c;', '(function () {}.length < b && b < c);'],
		['const result = ({value: 1}.value < b) < c;', 'const result = {value: 1}.value < b && b < c;'],
		['function check() { return ({value: 1}.value < b) < c; }', 'function check() { return {value: 1}.value < b && b < c; }'],
		['(({value: 1}.value < b) < c);', '({value: 1}.value < b && b < c);'],
		['(({value: 1}.value) < b) < c;', '({value: 1}.value) < b && b < c;'],
		['const check = () => ({value: 1}.value < b) < c;', 'const check = () => ({value: 1}.value < b && b < c);'],
		['const check = () => (function () {}.length < b) < c;', 'const check = () => function () {}.length < b && b < c;'],
	].map(([code, output]) => ({
		code,
		errors: [{messageId: 'no-chained-comparison/error', suggestions: [{messageId: 'no-chained-comparison/suggestion', output}]}],
	}))],
});
