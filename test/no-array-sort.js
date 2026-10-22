import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const FORBID_EXPRESSION_OPTIONS = [{allowExpressionStatement: false}];

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			'/** @param {URLSearchParams} values */ function run(values) { return values.sort(); }',
			'/** @returns {URLSearchParams} */ function read() { return source; } const values = read(); const result = values.sort();',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [],
	});
}

test.snapshot({
	valid: [
		'/** @param {Set<number>} collection */ function run(collection) { return collection.sort(); }',
		// Known non-array receiver (type information)
		{
			code: 'function f(foo: Set<number>) { foo.sort(); }',
			languageOptions: {parser: parsers.typescript},
		},
		'sorted =[...array].toSorted()',
		'sorted =array.toSorted()',
		'sorted =[...array].sort',
		'sorted =[...array].sort?.()',
		'array.sort()',
		'array.sort?.()',
		'array?.sort()',
		'if (true) array.sort()',
		'sorted = array.sort(...[])',
		'sorted = array.sort(...[compareFn])',
		'sorted = array.sort(compareFn, extraArgument)',
		// Not `Array#sort()` -- argument is not a compare function
		'sorted = collection.sort({field: 1})',
		'sorted = query.sort("field")',
		'sorted = query.sort(1)',
		'sorted = query.sort(-1)',
		'sorted = query.sort(+1)',
		'sorted = query.sort(`field`)',
		'sorted = query.sort([criteria])',
		'const docs = collection.find({id}).sort({expireAt: -1}).limit(1).toArray()',
		'[...array].sort({field: 1})',
		{
			code: 'collection.sort({field: 1})',
			options: FORBID_EXPRESSION_OPTIONS,
		},
		// A lone array hole is not a spread element
		'[,].sort()',
		'[, ,].sort()',
	],
	invalid: [
		'sorted = [...array].sort()',
		'sorted = [...array]?.sort()',
		'sorted = array.sort()',
		'sorted = array?.sort()',
		'sorted = [...array].sort(compareFn)',
		'sorted = [...array]?.sort(compareFn)',
		'sorted = array.sort(compareFn)',
		'sorted = array?.sort(compareFn)',
		{
			code: 'array.sort()',
			options: FORBID_EXPRESSION_OPTIONS,
		},
		{
			code: 'array?.sort()',
			options: FORBID_EXPRESSION_OPTIONS,
		},
		// Don't care about `allowExpression`
		{
			code: '[...array].sort()',
			options: FORBID_EXPRESSION_OPTIONS,
		},
		'sorted = [...(0, array)].sort()',
		// Spread argument is a low-precedence expression and needs parentheses when unwrapped
		'sorted = [...a + b].sort()',
		// The unwrap is not offered when a comment inside the array literal would be lost
		'sorted = [.../* keep */ a].sort()',
		'sorted = [/* keep */ ...a].sort()',
		'sorted = [\n\t// keep\n\t...a,\n].sort()',
		'sorted = [...a/* keep */].sort()',
		// A comment inside the argument is kept
		'sorted = [...foo(/* keep */)].sort()',
		// A receiver that is not an array literal has no `elements` to inspect
		'const x = a\n\t// keep\n\t.slice()\n\t.sort();',
		'/** @param {number[]} array */ function run(array) { return array.sort(); }',
	],
});

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.js', '*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			'/** @param {Map<string, number>} values */ function run(values) { return values.sort(compare); }',
			'/** @returns {{sort(): string}} */ function read() { return source; } const sorted = read().sort();',
			'/** @param {Map<string, number>} values */ function run(values, cache) { return (cache = values).sort(); }',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [
			...[
				'/** @returns {Uint8Array} */ function read() { return source; } const sorted = read().sort(compare);',
				'/** @type {ReadonlyArray<number>} */ const values = source; const alias = values; const sorted = alias.sort();',
				'/** @param {?Array<number>} values */ function run(values) { return values.sort(); }',
				'/** @param {Array<number> | Set<number>} values */ function run(values) { return values.sort(compare); }',
			].map(code => ({
				code,
				filename: 'file.ts',
				errors: [{
					messageId: 'error',
					suggestions: [{messageId: 'suggestion-apply-replacement', output: code.replace('.sort(', '.toSorted(')}],
				}],
			})),
		],
	});
}

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.js', '*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [{
			code: '/** @param {Array<number>} values */ function run(values: Set<number>) { return values.sort(); }',
			filename: 'file.ts',
		}],
		invalid: [{
			code: '/** @param {Set<number>} values */ function run(values: number[]) { return values.sort(); }',
			filename: 'file.ts',
			errors: [{
				messageId: 'error',
				suggestions: [{
					messageId: 'suggestion-apply-replacement',
					output: '/** @param {Set<number>} values */ function run(values: number[]) { return values.toSorted(); }',
				}],
			}],
		}],
	});
}
