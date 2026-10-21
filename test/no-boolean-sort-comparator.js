import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.js', '*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			'function run(Reflect) { values.sort(Reflect.set); }',
			'values.sort(Reflect.get);',
			'values.toSorted(Object.preventExtensions);',
			'/** @param {Set<object>} values */ function run(values) { values.sort(Reflect.isExtensible); }',
			'/** @returns {number} */ function compare(a, b) { return source; } values.sort(compare);',
			'/** @returns {?boolean} */ function compare(a, b) { return source; } values.sort(compare);',
			'/** @returns {boolean} */ async function compare(a, b) { return source; } values.sort(compare);',
			'/** @returns {boolean} */ let compare = (a, b) => source; compare = replacement; values.sort(compare);',
			'/** @param {Set<number>} values */ function run(values) { values.toSorted((a, b) => a > b); }',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [
			...[
				...['defineProperty', 'isExtensible', 'preventExtensions', 'set', 'setPrototypeOf'].map(method => `values.sort(Reflect.${method});`),
				'values.toSorted(Reflect["isExtensible"]);',
				'/** @returns {boolean} */ function compare(a, b) { return source; } values.sort(compare);',
				'/** @param {(a: number, b: number) => boolean} compare */ function run(compare) { values.toSorted(compare); }',
				'/** @type {{(a: number, b: number): boolean; (): boolean}} */ const compare = source; values.sort(compare);',
				'values.sort(/** @returns {boolean} */ (a, b) => source);',
			].map(code => ({code, filename: 'file.ts', errors: [{messageId: 'no-boolean-sort-comparator', suggestions: 0}]})),
			{
				code: '/** @param {Float32Array} values */ function run(values) { values.toSorted((a, b) => a < b); }',
				filename: 'file.ts',
				errors: [{
					messageId: 'no-boolean-sort-comparator',
					suggestions: [{
						messageId: 'no-boolean-sort-comparator/suggestion',
						data: {replacement: '(a, b) => b - a'},
						output: '/** @param {Float32Array} values */ function run(values) { values.toSorted((a, b) => b - a); }',
					}],
				}],
			},
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
			code: '/** @type {() => boolean} */ const compare = ((): number => source) satisfies Function; values.sort(compare);',
			filename: 'file.ts',
		}],
		invalid: [{
			code: '/** @type {() => number} */ const compare = ((): boolean => source) satisfies Function; values.sort(compare);',
			filename: 'file.ts',
			errors: [{messageId: 'no-boolean-sort-comparator', suggestions: 0}],
		}],
	});
}

test.snapshot({
	valid: [
		// Known non-array receiver (type information)
		{
			code: 'function f(set: Set<number>) { set.sort((a, b) => a > b); }',
			languageOptions: {parser: parsers.typescript},
		},
		'array.sort()',
		'array.toSorted()',
		'array.sort(compareFunction)',
		'array.sort((a, b) => a - b)',
		'array.sort((a, b) => b - a)',
		'array.sort((a, b) => a.score - b.score)',
		'array.sort((a, b) => a.localeCompare(b))',
		'array.toSorted((a, b) => a.localeCompare(b))',
		'array.sort((a, b) => a > b ? 1 : -1)',
		'array.sort((a, b) => a > b ? 1 : a < b ? -1 : 0)',
		'array.sort((a, b) => a.foo - b.foo || a.bar - b.bar)',
		'array.sort((a, b) => Math.random() - 0.5)',
		'array.sort(...comparators)',
		'array.sort(...comparators, extraArgument)',
		'array[sort]((a, b) => a > b)',
		'new Set().sort((a, b) => a > b)',
		'({sort() {}}).sort((a, b) => a > b)',
		'const collection = new Set(); collection.sort((a, b) => a > b)',
		'const object = {}; object.sort((a, b) => a > b)',
		'const function_ = () => {}; function_.sort((a, b) => a > b)',
		'array.sort(async (a, b) => a > b)',
		'array.sort(function * (a, b) { return a > b; })',
		'array.sort((a, b) => unknownBoolean)',
		'const Boolean = () => 0;\narray.sort(Boolean)',
		'const isFinite = () => 0;\narray.sort(isFinite)',
		'const Number = {isFinite() { return 0; }};\narray.sort(Number.isFinite)',
		'const Number = {isNaN() { return 0; }};\narray.sort(Number["isNaN"])',
		'const Array = {isArray() { return 0; }};\narray.sort(Array.isArray)',
		'const Object = {is() { return 0; }};\narray.sort(Object.is)',
		'array.sort((a, b) => {\n\tif (a > b) {\n\t\treturn true;\n\t}\n\n\treturn false;\n})',
		'function compare(a, b) { return a - b; }\narray.sort(compare)',
	],
	invalid: [
		'array.sort((a, b) => a > b)',
		'[].sort((a, b) => a > b)',
		'Array.from(iterable).sort((a, b) => a > b)',
		'new Array().toSorted((a, b) => a > b)',
		'array.sort((a, b) => a >= b)',
		'array.sort((a, b) => a < b)',
		'array.sort((a, b) => a <= b)',
		'array.sort((a, b) => b > a)',
		'array.sort((a, b) => b >= a)',
		'array.sort((a, b) => b < a)',
		'array.sort((a, b) => b <= a)',
		'array.sort((a, b) => a.score > b.score)',
		'array.sort((a, b) => a.score >= b.score)',
		'array.sort((a, b) => a[0] < b[0])',
		'array.sort((a, b) => a[i] <= b[i])',
		'array.sort((a, b) => a.foo.bar > b.foo.bar)',
		'array.sort((a, b) => a > c)',
		'array.sort((a, b) => a.foo > b.bar)',
		'array.sort((a, b) => a[i] > b[j])',
		'array.sort((a, b) => a > b, extraArgument)',
		'array["sort"]((a, b) => a > b)',
		'array["toSorted"]((a, b) => a > b)',
		'const method = "sort";\narray[method]((a, b) => a > b)',
		'array.toSorted((a, b) => a > b)',
		'array.sort?.((a, b) => a > b)',
		'array?.sort((a, b) => a > b)',
		'array.sort(function (a, b) { return a > b; })',
		{
			code: 'array.sort(function (a, a) { return a > a; })',
			languageOptions: {sourceType: 'script'},
		},
		'array.sort((a, b) => {\n\treturn a > b;\n})',
		'array.sort((a, b) => (a) > (b))',
		'array.sort((a, b) => {\n\t// Compare\n\treturn a > b;\n})',
		'array.sort((a, b) => a === b)',
		'strings.toSorted((a, b) => a === b)',
		'array.sort((a, b) => a !== b)',
		'array.sort((a, b) => true)',
		'array.sort((a, b) => false)',
		'array.sort((a, b) => Boolean(a - b))',
		'array.sort((a, b) => !(a - b))',
		'array.sort((a, b) => a > b && c > d)',
		'array.sort((a, b) => a > b ? c > d : e > f)',
		'array.sort((a, b) => a in b)',
		'array.sort((a, b) => a instanceof b)',
		'array.sort(Boolean)',
		'array.toSorted(Boolean)',
		'array.sort(isFinite)',
		'array.sort(isNaN)',
		'array.sort(Array.isArray)',
		'array.sort(ArrayBuffer.isView)',
		'array.sort(Atomics.isLockFree)',
		'array.sort(Number.isFinite)',
		'array.sort(Number.isInteger)',
		'array.sort(Number.isNaN)',
		'array.sort(Number["isNaN"])',
		'array.sort(Number.isSafeInteger)',
		'array.sort(Object.hasOwn)',
		'array.sort(Object.is)',
		'array.sort(Object.isExtensible)',
		'array.sort(Object.isFrozen)',
		'array.sort(Object.isSealed)',
		'array.sort(Reflect.deleteProperty)',
		'array.sort(Reflect.has)',
		'array.sort(URL.canParse)',
		'const compare = (a, b) => a > b;\narray.sort(compare)',
		'const compare = function (a, b) { return a > b; };\narray.sort(compare)',
		'function compare(a, b) { return a > b; }\narray.sort(compare)',
		{
			code: 'array.sort((a: number, b: number): boolean => a > b)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.sort((Boolean as (value: unknown) => boolean))',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const compare: (a: number, b: number) => boolean = (a, b) => compareUnknown(a, b);\narray.sort(compare)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Comparator = (a: number, b: number) => boolean;\narray.sort(((a, b) => a > b) as Comparator)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Comparator = (a: number, b: number) => boolean;\narray.sort(compare as Comparator)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.sort(((a: number, b: number) => a > b) as (a: number, b: number) => boolean)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.sort(compare as (a: number, b: number) => boolean)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.sort((a: number, b: number): boolean => compare(a, b))',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.sort(function (a: number, b: number): boolean {\n\treturn compare(a, b);\n})',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.sort((a: number, b: number) => (a > b) as boolean)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.sort((a: number, b: number) => <boolean>(a > b))',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.sort((a: number, b: number) => (a > b) satisfies boolean)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.sort((a: number, b: number) => (a > b)!)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.sort(<T extends {score: number}>(a, b) => a.score > b.score)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.sort((a?, b?) => a > b)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.sort((a: number, b: number): boolean => {\n\tif (a > b) {\n\t\treturn true;\n\t}\n\n\treturn false;\n})',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.sort((a: unknown, b: unknown) => (a as number) > (b as number))',
			languageOptions: {parser: parsers.typescript},
		},
		// Non-null assertion on a known-boolean global reference
		{
			code: 'array.sort(Boolean!)',
			languageOptions: {parser: parsers.typescript},
		},
		// Destructured parameters: reported, but no suggestion since the parameters are not plain identifiers
		'array.sort(([a], [b]) => a > b)',
		// A typed array shares `Array#sort()`, and a boolean comparator is just as broken there
		{
			code: 'function f(array: Int8Array) { array.sort((a, b) => a > b); }',
			languageOptions: {parser: parsers.typescript},
		},
		// No suggestion when only one side is a member expression
		'array.sort((a, b) => a.score > b)',
		// No suggestion when an operand has a type assertion
		{
			code: 'array.sort((a, b) => (a as number) > b)',
			languageOptions: {parser: parsers.typescript},
		},
		// Boolean function type assertion under another wrapper
		{
			code: 'array.sort((compare as (a: number, b: number) => boolean)!)',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
