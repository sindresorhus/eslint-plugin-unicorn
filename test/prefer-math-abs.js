import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [
		'/** @param {bigint} input */ function run(input) { const value = input + 1n; return value < 0 ? -value : value; }',
		'/** @type {bigint} */ let value; value < 0 ? -value : value;',
		'/** @param {number | bigint} value */ function run(value) { return 0 < value ? value : -value; }',
		'/** @param {?bigint} value */ function run(value) { return value >= 0 ? value : -value; }',
		'/** @param {bigint} [value] */ function run(value) { return value < 0 ? -value : value; }',
		'/** @param {bigint} value */ function run(value, limit) { return value > limit || value < -limit; }',
		'/** @param {bigint} limit */ function run(value, limit) { return -limit >= value || limit <= value; }',
		'/** @returns {bigint} */ function read() { return source; } const value = read(); value < 0 ? -value : value;',
		'/** @param {bigint} input */ function run(input, limit) { const value = ~input; return value > limit || value < -limit; }',
	],
	invalid: [
		[
			'/** @param {number} value */ function run(value) { return value < 0 ? -value : value; }',
			'/** @param {number} value */ function run(value) { return Math.abs(value); }',
		],
		[
			'/** @param {number} value */ function run(value, limit) { return value > limit || value < -limit; }',
			'/** @param {number} value */ function run(value, limit) { return Math.abs(value) > limit; }',
		],
	].map(([code, output]) => ({
		code,
		errors: [{messageId: 'prefer-math-abs', suggestions: [{messageId: 'prefer-math-abs/suggestion', output}]}],
	})),
});

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			'/** @param {bigint} value */ function run(value) { return value < 0 ? -value : value; }',
			'/** @param {number | bigint} value */ function run(value) { return 0 < value ? value : -value; }',
			'/** @param {bigint} limit */ function run(value, limit) { return -limit >= value || limit <= value; }',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [{
			filename: 'file.ts',
			code: '/** @param {bigint} value */ function run(value: number) { return value < 0 ? -value : value; }',
			errors: [{
				messageId: 'prefer-math-abs',
				suggestions: [{
					messageId: 'prefer-math-abs/suggestion',
					output: '/** @param {bigint} value */ function run(value: number) { return Math.abs(value); }',
				}],
			}],
		}],
	});
}

nodeTest('documented bigint absolute expressions retain results without incompatible Math.abs suggestions', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'prefer-math-abs': rule}}},
		rules: {'unicorn/prefer-math-abs': 'error'},
	};
	for (const [code, expected] of [
		['/** @param {bigint} value */ function run(value) { return value < 0 ? -value : value; } run(-5n);', 5n],
		['/** @param {bigint} value */ function run(value, limit) { return value > limit || value < -limit; } run(-5n, 2);', true],
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(output), expected);
	}

	t.assert.throws(() => runInNewContext('Math.abs(-5n)'), {name: 'TypeError'});
});

test({
	valid: [],
	invalid: ['as number', 'satisfies number'].flatMap(wrapper => [
		[`limit ${wrapper} < value || value < -(limit ${wrapper})`, `Math.abs(value) > (limit ${wrapper})`],
		[`value <= -(limit ${wrapper}) || limit ${wrapper} <= value`, `Math.abs(value) >= (limit ${wrapper})`],
		[`(limit ${wrapper}) < value || value < -(limit ${wrapper})`, `Math.abs(value) > (limit ${wrapper})`],
	].map(([code, output]) => ({
		code,
		languageOptions: {parser: parsers.typescript},
		errors: [{
			messageId: 'prefer-math-abs',
			suggestions: [{messageId: 'prefer-math-abs/suggestion', output}],
		}],
	}))),
});

test.snapshot({
	valid: [
		'const absolute = Math.abs(value);',
		'value < 0 ? value : -value',
		'value > 0 ? -value : value',
		'value < 1 ? -value : value',
		'value < 0 ? -otherValue : value',
		'value < 0 ? -value : otherValue',
		'value < 0n ? -value : value',
		'value < BigInt(0) ? -value : value',
		'const value = 1n; value < 0 ? -value : value;',
		'const value = BigInt(1); value < 0 ? -value : value;',
		'function foo(value = 1n) { return value < 0 ? -value : value; }',
		'function foo(value = BigInt(1)) { return value < 0 ? -value : value; }',
		'value > limit || value < limit',
		'value > limit || otherValue < -limit',
		'value > limit || value <= -limit',
		'value > limit || value < -otherLimit',
		'value > 0n || value < -0n',
		'value > BigInt(0) || value < -BigInt(0)',
		'const value = 1n; const limit = 2n; value > limit || value < -limit;',
		'(value + 1) < 0 ? -(value + 1) : value + 1',
		'Math.abs(value) > limit',
		'Math.abs(value) >= limit',
		'value > limit && value < -limit',
	],
	invalid: [
		'value < 0 ? -value : value',
		'value <= 0 ? -value : value',
		'value > 0 ? value : -value',
		'value >= 0 ? value : -value',
		'value < 0 ? 0 - value : value',
		'value <= 0 ? 0 - value : value',
		'value < 0 ? value * -1 : value',
		'value < 0 ? -1 * value : value',
		'object.value < 0 ? -object.value : object.value',
		'0 > value ? -value : value',
		'0 >= value ? -value : value',
		'0 < value ? value : -value',
		'0 <= value ? value : -value',
		'function foo() {return value < 0 ? -value : value;}',
		'function foo() {return(value < 0 ? -value : value);}',
		'const absolute = value > limit || value < -limit;',
		'const absolute = value >= limit || value <= -limit;',
		'const absolute = value < -limit || value > limit;',
		'const absolute = value <= -limit || value >= limit;',
		'const absolute = limit < value || -limit > value;',
		'const absolute = limit <= value || -limit >= value;',
		'function foo() {return value > limit || value < -limit;}',
		'function foo() {return(value > limit || value < -limit);}',
		'const absolute = object.value > limit || object.value < -limit;',
		'const absolute = value > object.limit || value < -object.limit;',
		'value < 0 ? -/* comment */value : value',
		'value > limit || value < -/* comment */limit',
		outdent`
			if (number > POSITIVE_CONSTANT || number < -POSITIVE_CONSTANT) {
				console.log(number);
			}
		`,
		outdent`
			if (number >= POSITIVE_CONSTANT || number <= -POSITIVE_CONSTANT) {
				console.log(number);
			}
		`,
		'import {value} from "./value.js"; value < 0 ? -value : value;',
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		outdent`
			function foo(value: bigint) {
				return value < 0 ? -value : value;
			}
		`,
		outdent`
			function foo(value) {
				return (value as bigint) < 0 ? -(value as bigint) : (value as bigint);
			}
		`,
		outdent`
			function foo(value) {
				return (<bigint>value) < 0 ? -(<bigint>value) : (<bigint>value);
			}
		`,
		outdent`
			function foo(value: bigint, limit: bigint) {
				return value > limit || value < -limit;
			}
		`,
		outdent`
			const value: bigint = 1n;
			value < 0 ? -value : value;
		`,
		outdent`
			function foo(value: number | bigint) {
				return value < 0 ? -value : value;
			}
		`,
		outdent`
			function foo(value) {
				return (value as number | bigint) < 0 ? -(value as number | bigint) : (value as number | bigint);
			}
		`,
		outdent`
			function foo(value: bigint & {}) {
				return value < 0 ? -value : value;
			}
		`,
		outdent`
			const value: 1n = 1n;
			value < 0 ? -value : value;
		`,
		outdent`
			function foo(value) {
				return (value satisfies bigint) < 0 ? -(value satisfies bigint) : (value satisfies bigint);
			}
		`,
		outdent`
			function foo(value) {
				return (value as bigint)! < 0 ? -(value as bigint)! : (value as bigint)!;
			}
		`,
	],
	invalid: [
		outdent`
			function foo(value: number) {
				return value < 0 ? -value : value;
			}
		`,
		outdent`
			function foo(value) {
				return (value satisfies number) < 0 ? -(value satisfies number) : (value satisfies number);
			}
		`,
	],
});

// `Math.abs()` normalizes `-0` to `+0` and coerces, the ternary does neither
test({
	valid: [],
	invalid: [
		...[
			['const a = b < 0 ? -b : b;', 'const a = Math.abs(b);'],
			['const a = b <= 0 ? -b : b;', 'const a = Math.abs(b);'],
			['const a = b > 0 ? b : -b;', 'const a = Math.abs(b);'],
			['const a = b >= 0 ? b : -b;', 'const a = Math.abs(b);'],
		].map(([code, output]) => ({
			code,
			errors: [{
				messageId: 'prefer-math-abs',
				suggestions: [
					{messageId: 'prefer-math-abs/suggestion', output},
				],
			}],
		})),
	],
});
