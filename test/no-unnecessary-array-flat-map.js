import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typescript = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {parser: parsers.typescript},
});

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

const vueTypescript = code => ({
	code,
	filename: 'file.vue',
	languageOptions: {
		parser: parsers.vue,
		parserOptions: {parser: typescriptEslintParser},
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
		typescript(outdent`
			type RecordType = 'a' | 'b';
			type Record = {_id: string; type?: RecordType};
			declare const records: Record[];
			declare const newIds: string[];
			const types = new Set(records.flatMap(record => newIds.includes(record._id) && record.type ? [record.type] : []));
		`),
		typescript('function foo(array: string[]) { return array.flatMap((value: string) => value.length > 1 ? [value] : []); }'),
		typescript('declare const array: Array<string | undefined>; array.flatMap(value => value ? [value] : []);'),
		typescript(outdent`
			type Record = {type?: string};
			declare const records: Record[];
			records.flatMap(record => record.type ? [{type: record.type}] : []);
		`),
		typescript('function foo(array: string[]) { return array.flatMap(value => value.length > 1 ? [value as string] : []); }'),
		typescript('function foo(array: string[]) { return array.flatMap(value => value.length > 1 ? [value!] : []); }'),
		typescript('function foo(array: string[]) { return array.flatMap(value => value.length > 1 ? [value satisfies string] : []); }'),
		vueTypescript(outdent`
			<script setup lang="ts">
			type RecordType = 'a' | 'b';
			type Record = {_id: string; type?: RecordType};
			declare const records: Record[];
			declare const newIds: string[];
			const types = new Set(records.flatMap(record => newIds.includes(record._id) && record.type ? [record.type] : []));
			</script>
		`),
		vueTypescript(outdent`
			<script lang="ts">
			declare const array: Array<{active: boolean}>;
			array.flatMap(value => value.active ? [value] : []);
			</script>
		`),
		vueTypescript(outdent`
			<script lang="tsx">
			type Item = {active: boolean; id: string};
			declare const array: Item[];
			array.flatMap(value => value.active ? [value.id] : []);
			</script>
		`),
		vueTypescript(outdent`
			<script setup lang="tsx">
			type Item = {active: boolean; id: string};
			declare const array: Item[];
			array.flatMap(value => value.active ? [value.id] : []);
			</script>
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
		'array.flatMap(value => (value = value.id) ? [value] : []);',
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
			code: 'array.flatMap(value => [<Item>{id: value.id}]);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.flatMap(value => [{id: value.id}!]);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.flatMap<string>(value => [value]);',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('declare const array: string[]; array.flatMap(value => [value]);'),
		typescript('array.filter(value => value).flatMap(value => [value as string]);'),
		typescript('array.filter(value => value).flatMap(value => [value satisfies string]);'),
		typescript('array.filter(value => value).flatMap(value => [<string>value]);'),
		typescript('array.filter(value => value).flatMap(value => [value!]);'),
		typescript('array.filter(value => value).flatMap(value => [{id: value.id} as Item]);'),
		typescript('array.filter(value => value).flatMap(value => [(value.id, value.name) as Item]);'),
		vueTypescript('<script setup lang="ts">array.flatMap(value => [value.id]);</script>'),
		{
			code: '<script>array.flatMap(value => value.active ? [value.id] : []);</script>',
			filename: 'file.vue',
			languageOptions: {parser: parsers.vue},
		},
		{
			code: '<script setup lang="js">array.flatMap(value => value.active ? [value.id] : []);</script>',
			filename: 'file.vue',
			languageOptions: {parser: parsers.vue},
		},
		{
			code: '<script lang="js">array.flatMap(value => value.active ? [value.id] : []);</script>',
			filename: 'file.vue',
			languageOptions: {parser: parsers.vue},
		},
	],
});
