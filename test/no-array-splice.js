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
		'const removed = array.splice(1, 1);',
		'function foo() { return array.splice(1, 1); }',
		'foo(array.splice(1, 1));',
		'const array = []; array.splice(1, 1);',
		'import array from "array"; array.splice(1, 1);',
		'array.splice(1, 1);',
		'object.array.splice(1, 1);',
		'array?.splice(1, 1);',
		'array.splice?.(1, 1);',
		'array["splice"](1, 1);',
		'array[splice](1, 1);',
		'array.toSpliced(1, 1);',
		'function array() {} array.splice(1, 1);',
		'class array {} array.splice(1, 1);',
		'let array = []; { const array = []; array.splice(1, 1); }',
		'let array = otherArray; array.splice(1, 1);',
		'let {array} = object; array.splice(1, 1);',
		'let array = []; array.splice();',
		'let array = []; array.splice(index, 0);',
		'let array = []; array.splice(0);',
		'let array = []; array.splice(0, 1);',
		'let array = []; array.splice(0, 0, item);',
		'let array = []; array.splice(array.length - 1, 1);',
		'let array = []; array.splice(array.length, 0, item);',
		{
			code: 'var array = []; array.splice(1, 1);',
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: 'function foo(set: Set<string>) { set.splice(1, 1); }',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'function foo(set: Set<string>) { (set as Set<string>).splice(1, 1); }',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'let array: [string, string] = ["a", "b"]; array.splice(1, 1);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'let array: readonly [string, string] = ["a", "b"]; array.splice(1, 1);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'type Pair = [string, string]; let array: Pair = ["a", "b"]; array.splice(1, 1);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'function foo<T extends string[]>(array: T) { array.splice(1, 1); }',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'function foo<T extends string[]>(value: T) { let array = value; array.splice(1, 1); }',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'function foo<T extends string[]>(source: {array: T}) { let {array}: {array: T} = source; array.splice(1, 1); }',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'function foo<T extends string[]>({array}: {array: T}) { array.splice(1, 1); }',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'function foo<T extends string[]>(array = value as T) { array.splice(1, 1); }',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'function foo<T extends string[]>(...array: T) { array.splice(1, 1); }',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'let array = otherArray as string[]; array.splice(1, 1);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'let array = otherArray satisfies string[]; array.splice(1, 1);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'let array = otherArray!; array.splice(1, 1);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		typeAware('let array = ["a", "b"] as const as [string, string]; array.splice(1, 1);'),
		typeAware('function foo<T extends string[]>(value: T) { let array = value; array.splice(1, 1); }'),
		typeAware('const first = ["a", "b"] as [string, string]; const second = ["a", "b", "c"] as [string, string, string]; let array = condition ? first : second; array.splice(1, 1);'),
		{
			code: 'let array: string[] = []; (array satisfies string[]).splice((array satisfies string[]).length, 0, item);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		'using array = acquire(); array.splice(1, 1);',
	],
	invalid: [
		'let array = []; array.splice(index, deleteCount);',
		'var array = []; array.splice(index, deleteCount, item);',
		'function foo(array) { array.splice(1, 1); }',
		'try {} catch (array) { array.splice(1, 1); }',
		'let array = []; array.splice(1, 1, /* comment */ item, ...items);',
		'let array = []; array /* comment */ .splice(1, 1);',
		String.raw`let \u0061rray = []; \u0061rray.splice(1, 1);`,
		'let array = []; (array).splice(1, 1);',
		'let array = []; array. /* comment */ splice(1, 1);',
		{
			code: 'let array: string[] = []; array.splice(1, 1);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'let array: Array<string> = []; array.splice(1, 1);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'let array: string[] = []; (array as string[]).splice(1, 1);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'let array: string[] = []; array!.splice(1, 1);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});
