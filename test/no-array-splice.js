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
		// Array from an external source may be shared, so the in-place mutation must be preserved
		'let structures = getStructures(); structures.splice(0, 1);',
		'function foo(array) { array.splice(1, 1); }',
		'try {} catch (array) { array.splice(1, 1); }',
		'let array; array = []; array.splice(1, 1);',
		// A redeclared `var` may be reinitialized with a non-fresh array later
		'var array = []; var array = getArray(); array.splice(1, 1);',
		// Reassigned to an external value, so it no longer holds the fresh array
		'let array = []; array = getArray(); array.splice(1, 1);',
		// Destructured binding may hold an external element, not a fresh array
		'let [array] = [getArray()]; array.splice(1, 1);',
		// The array escapes, so an outside holder may observe the in-place mutation
		'let array = []; foo(array); array.splice(1, 1);',
		'let array = []; new Set(array); array.splice(1, 1);',
		'let array = []; const alias = array; array.splice(1, 1);',
		'let array = []; let alias; alias = array; array.splice(1, 1);',
		'let array = []; obj.property = array; array.splice(1, 1);',
		'let array = []; function getArray() { return array; } array.splice(1, 1);',
		'function foo() { let array = []; array.splice(1, 1); return array; }',
		'let array = []; const wrapper = [array]; array.splice(1, 1);',
		'let array = []; const wrapper = {array}; array.splice(1, 1);',
		// `for…in` reads the array as a value, unlike the `for…of` case below
		'let array = []; for (const key in array) {} array.splice(1, 1);',
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
		// Fresh arrays the scope owns
		'let array = new Array(); array.splice(1, 1);',
		'let array = new Array(5); array.splice(1, 1);',
		'let array = Array.from(iterable); array.splice(1, 1);',
		'let array = Array.of(1, 2, 3); array.splice(1, 1);',
		'let array = items.filter(Boolean); array.splice(1, 1);',
		'let array = items.map(String); array.splice(1, 1);',
		'let array = items.flat(); array.splice(1, 1);',
		'let array = items.toSorted(); array.splice(1, 1);',
		'let array = items.with(0, item); array.splice(1, 1);',
		'let array = original.toSpliced(0, 1); array.splice(1, 1);',
		// A fresh array from a method call through a member chain
		'let array = object.items.filter(Boolean); array.splice(1, 1);',
		// Non-escaping reads keep the array local
		'let array = []; array.forEach(foo); array.splice(1, 1);',
		'let array = []; foo(...array); array.splice(1, 1);',
		'let array = []; const first = array[0]; array.splice(1, 1);',
		'let array = []; for (const element of array) {} array.splice(1, 1);',
		// Each call on the same fresh, non-escaping array is reported
		'let array = []; array.splice(1, 1); array.splice(2, 1);',
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
