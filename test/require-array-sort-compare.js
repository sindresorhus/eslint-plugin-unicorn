import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {outdent} from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['values /* keep */.sort();', 'values /* keep */.sort(COMPARATOR);'],
		['values.toSorted(/* keep */);', 'values.toSorted(/* keep */COMPARATOR);'],
		['values.sort(/* keep */ undefined);', 'values.sort(/* keep */ COMPARATOR);'],
		['values.sort(undefined /* keep */);', 'values.sort(COMPARATOR /* keep */);'],
		['getValues(/* keep */).toSorted(undefined);', 'getValues(/* keep */).toSorted(COMPARATOR);'],
		['values./* keep */sort();', 'values./* keep */sort(COMPARATOR);'],
		['values.sort(// keep\r\n);', 'values.sort(// keep\r\nCOMPARATOR);'],
		['values?.toSorted(/* keep */);', 'values?.toSorted(/* keep */COMPARATOR);'],
	].map(([code, output]) => ({
		code,
		errors: [{
			messageId: 'require-array-sort-compare',
			suggestions: [
				['numeric', '(a, b) => a - b'],
				['string', '(a, b) => a.localeCompare(b)'],
			].map(([kind, comparator]) => ({messageId: `require-array-sort-compare/${kind}`, output: output.replace('COMPARATOR', () => comparator)})),
		}],
	})),
});

test({
	valid: [
		'new Uint8Array([/* keep */ 2, 1]).sort();',
		'values.sort?.(/* keep */);',
		'values.toSorted(... /* keep */ arguments_);',
	],
	invalid: [
		{
			code: '(values as /* keep */ number[]).sort();',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'require-array-sort-compare',
				suggestions: [
					{messageId: 'require-array-sort-compare/numeric', output: '(values as /* keep */ number[]).sort((a, b) => a - b);'},
					{messageId: 'require-array-sort-compare/string', output: '(values as /* keep */ number[]).sort((a, b) => a.localeCompare(b));'},
				],
			}],
		},
		...[
			'values.sort((/* keep */ undefined));',
			'values.toSorted(((undefined /* keep */)));',
		].map(code => ({code, errors: [{messageId: 'require-array-sort-compare', suggestions: []}]})),
	],
});

nodeTest('comment-preserving comparator suggestions stay manual and evaluate the receiver once', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'require-array-sort-compare': rule}}},
		rules: {'unicorn/require-array-sort-compare': 'error'},
	};
	for (const method of ['sort', 'toSorted']) {
		for (const [kind, values, expected, defaultSorted] of [
			['numeric', [10, 2, 1], [1, 2, 10], [1, 10, 2]],
			['string', ['b', 'a', 'c'], ['a', 'b', 'c'], ['a', 'b', 'c']],
		]) {
			const code = outdent`
				const input = ${JSON.stringify(values)};
				let evaluations = 0;
				function getValues() {
					evaluations++;
					return input;
				}
				const result = getValues(/* keep */).${method}(undefined);
				JSON.stringify({result, input, evaluations});
			`;
			const {output, fixed, messages} = linter.verifyAndFix(code, config);
			t.assert.strictEqual(fixed, false);
			t.assert.strictEqual(output, code);
			t.assert.strictEqual(messages.length, 1);
			t.assert.strictEqual(messages[0].fix, undefined);
			t.assert.strictEqual(messages[0].suggestions.length, 2);
			const suggestion = messages[0].suggestions.find(suggestion => suggestion.messageId === `require-array-sort-compare/${kind}`);
			const {range, text} = suggestion.fix;
			const suggested = code.slice(0, range[0]) + text + code.slice(range[1]);
			t.assert.ok(suggested.includes('getValues(/* keep */)'));
			t.assert.deepStrictEqual(JSON.parse(runInNewContext(code)), {result: defaultSorted, input: method === 'sort' ? defaultSorted : values, evaluations: 1});
			t.assert.deepStrictEqual(JSON.parse(runInNewContext(suggested)), {result: expected, input: method === 'sort' ? expected : values, evaluations: 1});
		}
	}
});

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		/*
		A typed array must stay unreported: `TypedArray#sort()` already sorts numerically, unlike `Array#sort()`.
		This rule deliberately calls `isKnownNonArray` directly rather than `shouldSkipKnownNonArrayReceiver`, which counts a typed array as array-like.
		*/
		{
			code: 'function f(foo: Int8Array) { foo.sort(); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const foo = new Int8Array(); foo.sort();',
			languageOptions: {parser: parsers.typescript},
		},
		// The same, resolved through type information instead of the annotation
		typeAware('declare function getBytes(): Int8Array; getBytes().sort();'),
		'array.sort(compareFunction)',
		'array.toSorted(compareFunction)',
		'array.sort((a, b) => a - b)',
		'array.sort((a, b) => a.localeCompare(b))',
		'array.toSorted((a, b) => a - b)',
		'array.toSorted((a, b) => a.localeCompare(b))',
		'array.sort(...[])',
		'array.toSorted(...[])',
		'array.sort?.()',
		'array?.sort?.()',
		'array["sort"]()',
		'array[sort]()',
		'Array.prototype.sort.call(array)',
		'Array.prototype.sort.apply(array)',
		'Array.prototype.toSorted.call(array)',
		'Array.prototype.toSorted.apply(array)',
		'({sort() {}}).sort()',
		'({toSorted() {}}).toSorted()',
		'(() => {}).sort()',
		'(class {}).sort()',
		'new Set().sort()',
		'new Set().toSorted()',
		'const collection = new Set(); collection.sort()',
		'const object = {}; object.sort()',
		'const object = {}; object.toSorted()',
		'const function_ = () => {}; function_.sort()',
		{
			code: 'const array: string = ""; array.sort()',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware(outdent`
			declare function getCollection(): {sort(): void};
			getCollection().sort();
		`),
	],
	invalid: [
		'array.sort()',
		'array.toSorted()',
		'array.sort(undefined)',
		'array.toSorted(undefined)',
		'array?.sort()',
		'array?.toSorted()',
		'[].sort()',
		'[].toSorted()',
		'[3, 2, 1].sort()',
		'Array.from(iterable).sort()',
		'Array.of(3, 2, 1).sort()',
		'new Array(3).sort()',
		'const array = []; array.sort()',
		'const array = Array.from(iterable); array.sort()',
		'const array = Array.of(3, 2, 1); array.toSorted()',
		'array.sort(/* comment */)',
		{
			code: 'const array: string[] = []; array.sort()',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const array: Array<string> = []; array.toSorted()',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(value as string[]).sort()',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(<string[]>value).toSorted()',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
