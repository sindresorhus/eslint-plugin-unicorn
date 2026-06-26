import outdent from 'outdent';
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
		'array.map(value => value);',
		'array.filter(value => value.active);',
		'array.filter(value => value.active).map(value => value.id);',
		'array.flatMap(value => [value, value * 2]);',
		'array.flatMap(value => [value, ...value.children]);',
		'array.flatMap(value => value.children);',
		'array.flatMap(value => []);',
		'array.flatMap(value => condition ? [] : [value]);',
		'array.flatMap(value => value.active ? [] : [value]);',
		'array.flatMap?.(value => [value]);',
		'array?.flatMap(value => [value]);',
		'array[flatMap](value => [value]);',
		'array.flatMap(value => [value], thisArgument);',
		'array.flatMap(async value => [value]);',
		'array.flatMap((value, index) => [value]);',
		'array.flatMap(({id}) => [id]);',
		'array.flatMap(value => { return [value]; });',
		'array.flatMap(function (value) { return [value]; });',
		'array.flatMap(...[value => [value]]);',
		'array.flatMap(value => value.active ? [value.id] : [value.name]);',
		'array.flatMap(value => value.active ? [value.id, value.name] : []);',
		'({flatMap(callback) { return callback(1); }}).flatMap(value => [value]);',
		'({filter() { return {flatMap() {}}; }}).filter(value => value.active).flatMap(value => [value.id]);',
		'new Set().flatMap(value => [value]);',
		'new Set().filter(value => value.active).flatMap(value => [value]);',
		typeAware('interface Collection {flatMap(callback: (value: string) => string[]): string[]} declare const collection: Collection; collection.flatMap(value => [value]);'),
		typeAware(outdent`
			interface Collection {
				filter(callback: (value: string) => boolean): {flatMap(callback: (value: string) => string[]): string[]};
			}
			declare const collection: Collection;
			collection.filter(value => value.length > 0).flatMap(value => [value]);
		`),
	],
	invalid: [
		'array.flatMap(value => [value]);',
		'array.flatMap(value => [value.id]);',
		'array.flatMap(value => [{id: value.id}]);',
		'array.flatMap(value => [(value.id, value.name)]);',
		'array.flatMap(value => [/* comment */ value]);',
		'array.filter(value => value.active).flatMap(value => [value.id]);',
		'array.filter(value => value.active).flatMap(value => [value]);',
		'array.filter(value => value.active).flatMap(value => [{id: value.id}]);',
		'array.filter(value => value.active).flatMap(value => [(value.id, value.name)]);',
		'array.flatMap(value => value.active ? [value] : []);',
		'array.flatMap(value => value.active ? [value.id] : []);',
		'class ArraySubclass extends Array { method() { return super.flatMap(value => [value.id]); } }',
		'class ArraySubclass extends Array { method() { return super.flatMap(value => value.active ? [value] : []); } }',
		'class ArraySubclass extends Array { method() { return super.flatMap(value => value.active ? [value.id] : []); } }',
		'array.flatMap(value => value.active ? [/* comment */ value.id] : []);',
		'array.flatMap(value => (value.active) ? ([value.id]) : []);',
		'array.flatMap(value => value.active ? [{id: value.id}] : []);',
		'array.flatMap(value => value.active ? [(value.id, value.name)] : []);',
		'array.flatMap(value => (index++, value.active) ? [index] : []);',
		'array.flatMap(value => value.active ? [sideEffect(value)] : []);',
		outdent`
			const result = array
				.filter(value => value.active)
				.flatMap(value => [value.id]);
		`,
		'array.filter(value => value.active).flatMap(value => [/* comment */ value.id]);',
		{
			code: 'array.filter<string>(value => value.active).flatMap(value => [value.id]);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.filter(value => value.active).flatMap<string>(value => [value.id]);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.filter((value: string) => value.length > 1).flatMap(value => [value.length]);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.filter((value): value is string => typeof value === "string").flatMap(value => [value.length]);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(array: string[]) { return array.flatMap((value: string) => [value as string]); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.flatMap(value => [{id: value.id} as Item]);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.flatMap(value => [{id: value.id} satisfies Item]);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.flatMap(value => [{id: value.id}!]);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(array: string[]) { return array.flatMap((value: string) => value.length > 1 ? [value] : []); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.flatMap<string>(value => [value]);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(array: string[]) { return array.flatMap(value => value.length > 1 ? [value as string] : []); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(array: string[]) { return array.flatMap(value => value.length > 1 ? [value!] : []); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(array: string[]) { return array.flatMap(value => value.length > 1 ? [value satisfies string] : []); }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('declare const array: string[]; array.flatMap(value => [value]);'),
	],
});
