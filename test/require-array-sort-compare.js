import {outdent} from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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
