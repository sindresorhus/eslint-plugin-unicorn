import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import unicorn from '../../index.js';

const linter = new Linter();

for (const {name, rule, code, output = code, value, reported = true, suggestion, suggestedValue} of [
	{
		name: 'documented string transformations preserve positive negative and empty search results',
		rule: 'no-unnecessary-boolean-comparison',
		code: [
			'/** @param {string} text */ function run(text) { return text.trim().toUpperCase().includes("X") === true; }',
			'JSON.stringify([run(" x "), run(" "), run("y")]);',
		].join('\n'),
		output: [
			'/** @param {string} text */ function run(text) { return text.trim().toUpperCase().includes("X"); }',
			'JSON.stringify([run(" x "), run(" "), run("y")]);',
		].join('\n'),
		value: '[true,false,false]',
	},
	{
		name: 'documented string factory chains preserve normalization and evaluate the factory once',
		rule: 'no-unnecessary-boolean-comparison',
		code: [
			'let reads = 0; /** @returns {string} */ function read() { reads++; return "  É "; }',
			'JSON.stringify([read().trimEnd().normalize("NFD").toLowerCase().startsWith("  e") === false, reads]);',
		].join('\n'),
		output: [
			'let reads = 0; /** @returns {string} */ function read() { reads++; return "  É "; }',
			'JSON.stringify([!read().trimEnd().normalize("NFD").toLowerCase().startsWith("  e"), reads]);',
		].join('\n'),
		value: '[false,1]',
	},
	{
		name: 'custom replacement hooks cannot turn a nonboolean search result into an unsafe boolean fix',
		rule: 'no-unnecessary-boolean-comparison',
		code: [
			'/** @param {string} text */ function run(text, pattern) { return text.replace(pattern, "").includes("x") === true; }',
			'run("x", {[Symbol.replace]() { return {includes() { return "yes"; }}; }});',
		].join('\n'),
		value: false,
		reported: false,
	},
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
	{
		name: 'documented array joins keep null and undefined element separators',
		rule: 'require-array-join-separator',
		code: '/** @param {Array<string | null | undefined>} values */ function run(values) { return values.join(); } run(["a", null, undefined, "b"]);',
		output: '/** @param {Array<string | null | undefined>} values */ function run(values) { return values.join(\',\'); } run(["a", null, undefined, "b"]);',
		value: 'a,,,b',
	},
	{
		name: 'documented typed array joins preserve numeric formatting',
		rule: 'require-array-join-separator',
		code: '/** @param {Uint8Array} values */ function run(values) { return values.join(); } run(new Uint8Array([0, 255]));',
		output: '/** @param {Uint8Array} values */ function run(values) { return values.join(\',\'); } run(new Uint8Array([0, 255]));',
		value: '0,255',
	},
	{
		name: 'explicit array prototype joins still work on documented arraylike records',
		rule: 'require-array-join-separator',
		code: '/** @param {{length: number}} values */ function run(values) { return [].join.call(values); } run({0: "left", 1: "right", length: 2});',
		output: '/** @param {{length: number}} values */ function run(values) { return [].join.call(values, \',\'); } run({0: "left", 1: "right", length: 2});',
		value: 'left,right',
	},
	{
		name: 'documented array value iteration preserves order and duplicate values',
		rule: 'prefer-array-iterable-methods',
		code: [
			'/** @param {Array<number>} values */ function run(values) {',
			'const output = []; for (const [, value] of values.entries()) { output.push(value); } return JSON.stringify(output);',
			'} run([3, 3, 1]);',
		].join('\n'),
		output: [
			'/** @param {Array<number>} values */ function run(values) {',
			'const output = []; for (const value of values) { output.push(value); } return JSON.stringify(output);',
			'} run([3, 3, 1]);',
		].join('\n'),
		value: '[3,3,1]',
	},
	{
		name: 'documented array key iteration retains positions independently of values',
		rule: 'prefer-array-iterable-methods',
		code: [
			'/** @param {Array<string>} values */ function run(values) {',
			'const output = []; for (const [index, value] of values.entries()) { output.push(index); } return JSON.stringify(output);',
			'} run(["right", "left"]);',
		].join('\n'),
		output: [
			'/** @param {Array<string>} values */ function run(values) {',
			'const output = []; for (const index of values.keys()) { output.push(index); } return JSON.stringify(output);',
			'} run(["right", "left"]);',
		].join('\n'),
		value: '[0,1]',
	},
	{
		name: 'removing entries does not duplicate documented array factories',
		rule: 'prefer-array-iterable-methods',
		code: [
			'let reads = 0; /** @returns {Array<number>} */ function read() { reads++; return [1, 2]; }',
			'const output = []; for (const [, value] of read().entries()) { output.push(value); } JSON.stringify([output, reads]);',
		].join('\n'),
		output: [
			'let reads = 0; /** @returns {Array<number>} */ function read() { reads++; return [1, 2]; }',
			'const output = []; for (const value of read()) { output.push(value); } JSON.stringify([output, reads]);',
		].join('\n'),
		value: '[[1,2],1]',
	},
	{
		name: 'direct documented array iteration preserves nested value destructuring',
		rule: 'prefer-array-iterable-methods',
		code: [
			'/** @param {Array<{label: string}>} values */ function run(values) {',
			'const output = []; for (const [, {label}] of values.entries()) { output.push(label); } return JSON.stringify(output);',
			'} run([{label: "a"}, {label: "b"}]);',
		].join('\n'),
		output: [
			'/** @param {Array<{label: string}>} values */ function run(values) {',
			'const output = []; for (const {label} of values) { output.push(label); } return JSON.stringify(output);',
			'} run([{label: "a"}, {label: "b"}]);',
		].join('\n'),
		value: '["a","b"]',
	},
	{
		name: 'documented map entries keep keys rather than inheriting array iteration semantics',
		rule: 'prefer-array-iterable-methods',
		code: [
			'/** @param {Map<string, number>} values */ function run(values) {',
			'const output = []; for (const [key, value] of values.entries()) { output.push(key); } return JSON.stringify(output);',
			'} run(new Map([["key", 42]]));',
		].join('\n'),
		value: '["key"]',
		reported: false,
	},
	{
		name: 'documented typed array entries retain the array-only iteration boundary',
		rule: 'prefer-array-iterable-methods',
		code: [
			'/** @param {Uint8Array} values */ function run(values) {',
			'const output = []; for (const [, value] of values.entries()) { output.push(value); } return JSON.stringify(output);',
			'} run(new Uint8Array([255, 0]));',
		].join('\n'),
		value: '[255,0]',
		reported: false,
	},
	{
		name: 'documented forEach conversion preserves value and index pairing',
		rule: 'no-for-each',
		code: [
			'/** @param {Array<string>} values */ function run(values) {',
			'const output = []; values.forEach((value, index) => { output.push([index, value]); }); return JSON.stringify(output);',
			'} run(["b", "a"]);',
		].join('\n'),
		output: [
			'/** @param {Array<string>} values */ function run(values) {',
			'const output = []; for (const [index, value] of values.entries()) { output.push([index, value]); } return JSON.stringify(output);',
			'} run(["b", "a"]);',
		].join('\n'),
		value: '[[0,"b"],[1,"a"]]',
	},
	{
		name: 'documented array aliases retain mutable callback parameters during loop conversion',
		rule: 'no-for-each',
		code: [
			'/** @param {Array<number>} values */ function run(values) {',
			'const alias = values; const output = []; alias.forEach(value => { value *= 2; output.push(value); }); return JSON.stringify([output, values]);',
			'} run([1, 2]);',
		].join('\n'),
		output: [
			'/** @param {Array<number>} values */ function run(values) {',
			'const alias = values; const output = []; for (let value of alias) { value *= 2; output.push(value); } return JSON.stringify([output, values]);',
			'} run([1, 2]);',
		].join('\n'),
		value: '[[2,4],[1,2]]',
	},
	{
		name: 'documented Set forEach callbacks retain collection behavior',
		rule: 'no-for-each',
		code: [
			'/** @param {Set<string>} values */ function run(values) {',
			'const output = []; values.forEach((value, key) => { output.push([key, value]); }); return JSON.stringify(output);',
			'} run(new Set(["b", "a"]));',
		].join('\n'),
		value: '[["b","b"],["a","a"]]',
		reported: false,
	},
	{
		name: 'documented array push suggestions intentionally change the returned length but retain mutation',
		rule: 'no-return-array-push',
		code: [
			'/** @param {Array<number>} stream */ function run(stream) { return stream.push(2); }',
			'const values = [1]; JSON.stringify([run(values), values]);',
		].join('\n'),
		value: '[2,[1,2]]',
		suggestion: [
			'/** @param {Array<number>} stream */ function run(stream) { stream.push(2); return; }',
			'const values = [1]; JSON.stringify([run(values), values]);',
		].join('\n'),
		suggestedValue: '[null,[1,2]]',
	},
	{
		name: 'documented numeric typed arrays copy coerced fill values without sharing references',
		rule: 'no-array-fill-with-reference-type',
		code: [
			'let reads = 0; /** @param {Uint8Array} values */ function run(values) {',
			'values.fill({valueOf() { reads++; return 7; }}); return JSON.stringify([Array.from(values), reads]);',
			'} run(new Uint8Array(2));',
		].join('\n'),
		value: '[[7,7],1]',
		reported: false,
	},
	{
		name: 'documented bigint typed array fills retain bigint coercion',
		rule: 'no-array-fill-with-reference-type',
		code: [
			'/** @param {BigInt64Array} values */ function run(values) {',
			'values.fill({valueOf() { return 3n; }}); return Array.from(values, String).join(",");',
			'} run(new BigInt64Array(2));',
		].join('\n'),
		value: '3,3',
		reported: false,
	},
	{
		name: 'documented RegExp flag properties remain primitive booleans',
		rule: 'no-unnecessary-boolean-comparison',
		code: '/** @param {RegExp} pattern */ function run(pattern) { return pattern.hasIndices === true; } JSON.stringify([run(/a/d), run(/a/)]);',
		output: '/** @param {RegExp} pattern */ function run(pattern) { return pattern.hasIndices; } JSON.stringify([run(/a/d), run(/a/)]);',
		value: '[true,false]',
	},
	{
		name: 'documented readonly Map boolean checks preserve SameValueZero key matching',
		rule: 'no-unnecessary-boolean-comparison',
		code: '/** @param {ReadonlyMap<number, string>} values */ function run(values) { return values.has(NaN) === false; } JSON.stringify([run(new Map([[NaN, "x"]])), run(new Map())]);',
		output: '/** @param {ReadonlyMap<number, string>} values */ function run(values) { return !values.has(NaN); } JSON.stringify([run(new Map([[NaN, "x"]])), run(new Map())]);',
		value: '[false,true]',
	},
	{
		name: 'documented weak collection membership fixes retain object identity',
		rule: 'no-unnecessary-boolean-comparison',
		code: [
			'/** @param {WeakSet<object>} values */ function run(values, key) { return values.has(key) !== false; }',
			'const key = {}; const values = new WeakSet([key]); JSON.stringify([run(values, key), run(values, {})]);',
		].join('\n'),
		output: [
			'/** @param {WeakSet<object>} values */ function run(values, key) { return values.has(key); }',
			'const key = {}; const values = new WeakSet([key]); JSON.stringify([run(values, key), run(values, {})]);',
		].join('\n'),
		value: '[true,false]',
	},
	{
		name: 'documented floating typed array membership keeps NaN matches',
		rule: 'no-unnecessary-boolean-comparison',
		code: '/** @param {Float64Array} values */ function run(values) { return values.includes(NaN) === true; } JSON.stringify([run(new Float64Array([NaN])), run(new Float64Array([0]))]);',
		output: '/** @param {Float64Array} values */ function run(values) { return values.includes(NaN); } JSON.stringify([run(new Float64Array([NaN])), run(new Float64Array([0]))]);',
		value: '[true,false]',
	},
	{
		name: 'documented bigint typed array predicates retain empty and negative element outcomes',
		rule: 'no-unnecessary-boolean-comparison',
		code: [
			'/** @param {BigInt64Array} values */ function run(values) { return values.every(value => value > 0n) === false; }',
			'JSON.stringify([run(new BigInt64Array()), run(new BigInt64Array([-1n])), run(new BigInt64Array([1n]))]);',
		].join('\n'),
		output: [
			'/** @param {BigInt64Array} values */ function run(values) { return !values.every(value => value > 0n); }',
			'JSON.stringify([run(new BigInt64Array()), run(new BigInt64Array([-1n])), run(new BigInt64Array([1n]))]);',
		].join('\n'),
		value: '[false,true,false]',
	},
	{
		name: 'documented string wellformedness checks preserve unpaired surrogate results',
		rule: 'no-unnecessary-boolean-comparison',
		code: [
			'/** @param {string} text */ function run(text) { return text.isWellFormed() === true; }',
			'JSON.stringify([run("🦄"), run(String.fromCharCode(0xD800))]);',
		].join('\n'),
		output: [
			'/** @param {string} text */ function run(text) { return text.isWellFormed(); }',
			'JSON.stringify([run("🦄"), run(String.fromCharCode(0xD800))]);',
		].join('\n'),
		value: '[true,false]',
	},
	{
		name: 'optional documented receiver calls keep strict comparison outcomes for missing values',
		rule: 'no-unnecessary-boolean-comparison',
		code: '/** @param {?RegExp} pattern */ function run(pattern) { return pattern?.test("a") === false; } JSON.stringify([run(null), run(/a/), run(/x/)]);',
		value: '[false,false,true]',
		reported: false,
	},
	{
		name: 'documented typed array sorting suggestions retain the observable mutation distinction',
		rule: 'no-array-sort',
		code: [
			'/** @param {Uint8Array} values */ function run(values) { return JSON.stringify([Array.from(values.sort()), Array.from(values)]); }',
			'run(new Uint8Array([2, 1]));',
		].join('\n'),
		value: '[[1,2],[1,2]]',
		suggestion: [
			'/** @param {Uint8Array} values */ function run(values) { return JSON.stringify([Array.from(values.toSorted()), Array.from(values)]); }',
			'run(new Uint8Array([2, 1]));',
		].join('\n'),
		suggestedValue: '[[1,2],[2,1]]',
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
