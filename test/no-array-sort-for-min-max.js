import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {outdent} from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test.snapshot({
	valid: [
		// Known non-array receiver (type information)
		{
			code: 'function f(set: Set<number>) { return set.toSorted((a, b) => a - b)[0]; }',
			languageOptions: {parser: parsers.typescript},
		},
		'const minimum = Math.min(...array);',
		'const minimum = array.reduce((minimum, value) => Math.min(minimum, value));',
		'const minimum = array.sort()[0];',
		'const minimum = array.toSorted()[0];',
		'const first = array.sort((a, b) => a.localeCompare(b))[0];',
		'const first = array.sort(compare)[0];',
		'const first = array.sort((a, b) => a - b || a.id - b.id)[0];',
		'const first = array.sort((a, b) => a.value - b.value)[0];',
		'const first = array.sort((a, b) => a - b)[1];',
		'const first = array.sort((a, b) => a - b).at(1);',
		'const first = array.sort((a, b) => a - b).at(index);',
		'const first = array.sort?.((a, b) => a - b)[0];',
		'const first = array?.sort((a, b) => a - b)[0];',
		'const first = array.sort((a, b) => a - b)?.[0];',
		'const first = object?.array.toSorted((a, b) => a - b)[0];',
		'const first = object?.array.toSorted((a, b) => a - b).at(0);',
		'const first = object?.array.sort((a, b) => a - b)[0];',
		'const first = object?.getArray().toSorted((a, b) => a - b)[0];',
		'const first = object?.getArray().toSorted((a, b) => a - b).at(0);',
		'const first = array["sort"]((a, b) => a - b)[0];',
		'const first = array.sort((a, b) => { return a - b; return 0; })[0];',
		'const first = array.sort((a, b) => {})[0];',
		'const first = array.sort(async (a, b) => a - b)[0];',
		'const first = array.sort(function * (a, b) { return a - b; })[0];',
		'const first = ({sort() {}}).sort((a, b) => a - b)[0];',
		'const first = new Set().sort((a, b) => a - b)[0];',
		'array.sort((a, b) => a - b)[0] = value;',
		'array.sort((a, b) => a - b)[0]++;',
		'delete array.sort((a, b) => a - b)[0];',
		'delete array.sort((a, b) => a - b).at(0);',
		'for (array.sort((a, b) => a - b)[0] of values) {}',
		'for (array.sort((a, b) => a - b)[0] in object) {}',
		{
			code: 'const first = array.sort(function (a, a) { return a - a; })[0];',
			languageOptions: {sourceType: 'script'},
		},
		{
			code: 'const first = object?.array!.toSorted((a: number, b: number) => a - b)[0];',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const first = object?.getArray()!.toSorted((a: number, b: number) => a - b)[0];',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const first = array.sort((a: number, b: number) => a - b).at(1);',
			languageOptions: {parser: parsers.typescript},
		},
		// `Math.min()` and `Math.max()` reject BigInt typed arrays
		'new BigInt64Array().sort((a, b) => a - b)[0];',
		'new BigUint64Array().sort((a, b) => a - b).at(-1);',
		'BigInt64Array.from([]).toSorted((a, b) => a - b)[0];',
		'BigUint64Array.of(1n).toSorted((a, b) => a - b).at(-1);',
		{
			code: 'function f(values: BigInt64Array) { return values.sort((a, b) => a - b)[0]; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(values: BigUint64Array) { return values.toSorted((a, b) => a - b).at(-1); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(values: BigInt64Array | Int8Array) { return values.toSorted((a, b) => a - b)[0]; }',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'const minimum = array.sort((a, b) => a - b)[0];',
		'const minimum = array.toSorted((a, b) => a - b)[0];',
		'const minimum = arrays[key?.name].toSorted((a, b) => a - b)[0];',
		'const minimum = array.sort((a, b) => a - b).at(0);',
		'const minimum = array.toSorted((a, b) => a - b).at(0);',
		'const maximum = array.sort((a, b) => a - b).at(-1);',
		'const maximum = array.toSorted((a, b) => a - b).at(-1);',
		'const maximum = array.sort((a, b) => b - a)[0];',
		'const maximum = array.toSorted((a, b) => b - a)[0];',
		'const minimum = array.sort((a, b) => b - a).at(-1);',
		'const minimum = array.toSorted((a, b) => b - a).at(-1);',
		outdent`
			const minimum = array.sort(function (a, b) {
				return a - b;
			})[0];
		`,
		outdent`
			const maximum = array.toSorted((a, b) => {
				return a - b;
			}).at(-1);
		`,
		'const minimum = (array ?? fallback).toSorted((a, b) => a - b)[0];',
		outdent`
			const minimum = array.toSorted((a, b) => {
				// Compare numerically.
				return a - b;
			})[0];
		`,
		outdent`
			class ArraySubclass extends Array {
				getMinimum() {
					return super.sort((a, b) => a - b)[0];
				}
			}
		`,
		{
			code: 'const minimum = array.sort((a: number, b: number) => a - b)[0];',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const minimum = array.toSorted((a, b) => (a - b) as number)[0];',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const minimum = array.toSorted((a, b) => a - b satisfies number)[0];',
			languageOptions: {parser: parsers.typescript},
		},
		// A typed array shares `Array#toSorted()`, and `Math.min()` spreads one just as well
		{
			code: 'function f(array: Int8Array) { return array.toSorted((a, b) => a - b)[0]; }',
			languageOptions: {parser: parsers.typescript},
		},
		// The iterated value of a loop is not its left-hand side
		'for (const value of array.sort((a, b) => a - b)[0]) {}',
	],
});

test({
	valid: [],
	invalid: [
		['new ([3, 1, 2].toSorted((a, b) => a - b))[0].constructor("42");', 'new (Math.min(...[3, 1, 2])).constructor("42");', 'Math.min(...[3, 1, 2])'],
		['new (([3, 1, 2].toSorted((a, b) => a - b))[0]).constructor("42");', 'new (Math.min(...[3, 1, 2])).constructor("42");', 'Math.min(...[3, 1, 2])'],
		['const minimum = [3, 1, 2].toSorted((a, b) => a - b)[0];', 'const minimum = Math.min(...[3, 1, 2]);', 'Math.min(...[3, 1, 2])'],
	].map(([code, output, replacement]) => ({
		code,
		errors: [{messageId: 'no-array-sort-for-min-max/error', suggestions: [{messageId: 'no-array-sort-for-min-max/suggestion', data: {replacement}, output}]}],
	})),
});

test({
	valid: [],
	invalid: [{
		code: 'new ([3, 1, 2].toSorted((a, b) => a - b))[0]!.constructor("42");',
		languageOptions: {parser: parsers.typescript},
		errors: [{
			messageId: 'no-array-sort-for-min-max/error', suggestions: [{
				messageId: 'no-array-sort-for-min-max/suggestion',
				data: {replacement: 'Math.min(...[3, 1, 2])'},
				output: 'new (Math.min(...[3, 1, 2]))!.constructor("42");',
			}],
		}],
	}],
});

nodeTest('min/max suggestions preserve the actual number constructor', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'no-array-sort-for-min-max': rule}}},
		rules: {'unicorn/no-array-sort-for-min-max': 'error'},
	};
	for (const code of ['new ([3, 1, 2].toSorted((a, b) => a - b))[0].constructor("42");', 'new (([3, 1, 2].toSorted((a, b) => a - b))[0]).constructor("42");']) {
		const [problem] = linter.verify(code, config);
		t.assert.strictEqual(problem.messageId, 'no-array-sort-for-min-max/error');
		const {fix} = problem.suggestions[0];
		const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		const original = runInNewContext(code);
		const corrected = runInNewContext(output);
		t.assert.strictEqual(typeof corrected, 'object');
		t.assert.strictEqual(Number(corrected), Number(original));
		t.assert.strictEqual(Number(corrected), 42);
		t.assert.deepStrictEqual(linter.verify(output, config), []);
	}
});
