import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import unicorn from '../../index.js';

const linter = new Linter();

for (const {name, rule, code, output = code, value, reported = true, suggestion, suggestedValue} of [
	{
		name: 'documented numeric NaN checks retain all numeric outcomes after autofix',
		rule: 'prefer-number-properties',
		code: '/** @param {number} value */ function run(value) { return isNaN(value); } JSON.stringify([run(Number.NaN), run(0), run(Number.POSITIVE_INFINITY), run(-0)]);',
		output: '/** @param {number} value */ function run(value) { return Number.isNaN(value); } JSON.stringify([run(Number.NaN), run(0), run(Number.POSITIVE_INFINITY), run(-0)]);',
		value: '[true,false,false,false]',
	},
	{
		name: 'documented numeric call results are evaluated once by finite checks',
		rule: 'prefer-number-properties',
		code: [
			'let reads = 0;',
			'/** @returns {number} */ function read(value) { reads++; return value; }',
			'JSON.stringify([isFinite(read(Number.POSITIVE_INFINITY)), reads]);',
		].join('\n'),
		output: [
			'let reads = 0;',
			'/** @returns {number} */ function read(value) { reads++; return value; }',
			'JSON.stringify([Number.isFinite(read(Number.POSITIVE_INFINITY)), reads]);',
		].join('\n'),
		value: '[false,1]',
	},
	{
		name: 'strict numeric subtraction fixes do not duplicate a documented read',
		rule: 'no-subtraction-comparison',
		code: [
			'let reads = 0;',
			'/** @returns {number} */ function read(value) { reads++; return value; }',
			'JSON.stringify([(read(2) - 1) > 0, reads]);',
		].join('\n'),
		output: [
			'let reads = 0;',
			'/** @returns {number} */ function read(value) { reads++; return value; }',
			'JSON.stringify([read(2) > 1, reads]);',
		].join('\n'),
		value: '[true,1]',
	},
	{
		name: 'mirrored numeric subtraction fixes preserve NaN and signed zero comparisons',
		rule: 'no-subtraction-comparison',
		code: [
			'/** @param {number} left\n * @param {number} right */ function run(left, right) { return 0 > left - right; }',
			'JSON.stringify([run(Number.NaN, 1), run(-0, 0), run(1, 2), run(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)]);',
		].join('\n'),
		output: [
			'/** @param {number} left\n * @param {number} right */ function run(left, right) { return left < right; }',
			'JSON.stringify([run(Number.NaN, 1), run(-0, 0), run(1, 2), run(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)]);',
		].join('\n'),
		value: '[false,false,true,false]',
	},
	{
		name: 'documented numeric equality still needs a suggestion for infinite operands',
		rule: 'no-subtraction-comparison',
		code: '/** @param {number} left\n * @param {number} right */ function run(left, right) { return left - right === 0; } run(Infinity, Infinity);',
		value: false,
		suggestion: '/** @param {number} left\n * @param {number} right */ function run(left, right) { return left === right; } run(Infinity, Infinity);',
		suggestedValue: true,
	},
	{
		name: 'unknown finite-check inputs retain numeric coercion until a suggestion is chosen',
		rule: 'prefer-number-properties',
		code: '/** @param {unknown} value */ function run(value) { return isFinite(value); } run("0");',
		value: true,
		suggestion: '/** @param {unknown} value */ function run(value) { return Number.isFinite(value); } run("0");',
		suggestedValue: false,
	},
	{
		name: 'mixed numeric and string subtraction keeps its numeric comparison semantics',
		rule: 'no-subtraction-comparison',
		code: '/** @param {number | string} left\n * @param {number | string} right */ function run(left, right) { return left - right > 0; } run("11", "2");',
		value: true,
		suggestion: '/** @param {number | string} left\n * @param {number | string} right */ function run(left, right) { return left > right; } run("11", "2");',
		suggestedValue: false,
	},
	{
		name: 'documented bigint initializers do not acquire throwing Math calls',
		rule: 'prefer-math-min-max',
		code: '/** @returns {bigint} */ function read(input) { return input; } const value = read(2n); value > 0 ? value : 0;',
		value: 2n,
		reported: false,
	},
	{
		name: 'documented bigint parameter defaults preserve numeric fallback branches',
		rule: 'prefer-math-min-max',
		code: '/** @returns {bigint} */ function read(input) { return input; } function run(value = read(-2n)) { return value > 0 ? value : 0; } run();',
		value: 0,
		reported: false,
	},
	{
		name: 'documented split join fixes preserve literal replacement dollars',
		rule: 'prefer-string-replace-all',
		code: '/** @param {string} text */ function run(text) { return text.split("_").join("$&"); } run("a_b_c");',
		output: '/** @param {string} text */ function run(text) { return text.replaceAll(\'_\', \'$$&\'); } run("a_b_c");',
		value: 'a$&b$&c',
	},
	{
		name: 'documented string match fixes preserve positive and negative existence checks',
		rule: 'prefer-regexp-test',
		code: '/** @param {string} text */ function run(text) { if (text.match(/a/)) { return true; } return false; } JSON.stringify([run("a"), run("x")]);',
		output: '/** @param {string} text */ function run(text) { if (/a/.test(text)) { return true; } return false; } JSON.stringify([run("a"), run("x")]);',
		value: '[true,false]',
	},
	{
		name: 'documented string patterns do not become nonexistent test methods',
		rule: 'prefer-regexp-test',
		code: '/** @param {string} text\n * @param {string} pattern */ function run(text, pattern) { return Boolean(text.match(pattern)); } run("abc", "a.");',
		value: true,
		reported: false,
	},
]) {
	test(name, t => {
		const ruleId = `unicorn/${rule}`;
		const config = {plugins: {unicorn}, rules: {[ruleId]: 'error'}};
		const messages = linter.verify(code, config);
		t.assert.strictEqual(messages.length, reported ? 1 : 0);
		if (reported) {
			t.assert.strictEqual(messages[0].ruleId, ruleId);
		}

		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, code !== output);
		t.assert.strictEqual(result.output, output);
		t.assert.strictEqual(runInNewContext(code), value);
		t.assert.strictEqual(runInNewContext(result.output), value);
		t.assert.deepStrictEqual(linter.verifyAndFix(output, config), {...result, fixed: false});
		if (suggestion) {
			t.assert.strictEqual(result.messages.length, 1);
			t.assert.strictEqual(result.messages[0].suggestions.length, 1);
			const {range, text} = result.messages[0].suggestions[0].fix;
			const suggested = code.slice(0, range[0]) + text + code.slice(range[1]);
			t.assert.strictEqual(suggested, suggestion);
			t.assert.strictEqual(runInNewContext(suggested), suggestedValue);
		} else {
			t.assert.deepStrictEqual(result.messages, []);
		}
	});
}
