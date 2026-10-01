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

const vueWithTypeScriptParser = code => ({
	code,
	filename: 'file.vue',
	languageOptions: {
		parser: parsers.vue,
		parserOptions: {parser: typescriptEslintParser},
	},
});

test({
	valid: [
		'let value = 1; value = [1, 2]; array.flatMap(() => [value]);',
		'const object = {value: 1}; object.value = [1, 2]; array.flatMap(() => [object.value]);',
		typescript('const value: string & any = [1, 2]; const output = [0].flatMap(() => [value]);'),
		typescript('type Unchecked = any; declare const value: number & Unchecked; array.flatMap(() => [value]);'),
		typescript('declare const value: string | (number & any); array.flatMap(() => [value]);'),
		typeAware('const value: string & any = [1, 2]; const output = [0].flatMap(() => [value]);'),
	],
	invalid: [
		{
			...typescript('declare const condition: boolean; const output = [0].flatMap(() => condition ? [1] : []); output.push(2);'),
			errors: [{
				messageId: 'no-unnecessary-array-flat-map/array-wrapper',
				suggestions: [{
					messageId: 'no-unnecessary-array-flat-map/array-wrapper-suggestion',
					output: 'declare const condition: boolean; const output = [0].flatMap(() => condition ? 1 : []); output.push(2);',
				}],
			}],
		},
		{
			code: '[].flatMap(() => Math.random() ? [1] : [2, 3]);',
			output: '[].flatMap(() => Math.random() ? 1 : [2, 3]);',
			errors: [{messageId: 'no-unnecessary-array-flat-map/array-wrapper'}],
		},
		{
			...typescript('declare const value: string; [].flatMap(function () { if (Math.random()) { return [value]; } return [2, 3]; });'),
			errors: [{
				messageId: 'no-unnecessary-array-flat-map/array-wrapper',
				suggestions: [{
					messageId: 'no-unnecessary-array-flat-map/array-wrapper-suggestion',
					output: 'declare const value: string; [].flatMap(function () { if (Math.random()) { return value; } return [2, 3]; });',
				}],
			}],
		},
		{
			...typescript('declare const value: string & {brand: true}; array.flatMap(() => [value]);'),
			errors: [{
				messageId: 'no-unnecessary-array-flat-map/array-wrapper',
				suggestions: [{
					messageId: 'no-unnecessary-array-flat-map/array-wrapper-suggestion',
					output: 'declare const value: string & {brand: true}; array.flatMap(() => value);',
				}],
			}],
		},
	],
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
		typescript('declare const array: Array<string | undefined>; array.flatMap(value => value ? [value] : []);'),
		typescript('function foo(array: string[]) { return array.flatMap(value => value.length > 1 ? [value!] : []); }'),
		typescript('function foo(array: string[]) { return array.flatMap(value => value.length > 1 ? [value satisfies string] : []); }'),
		vueWithTypeScriptParser(outdent`
			<script setup lang="ts">
			type RecordType = 'a' | 'b';
			type Record = {_id: string; type?: RecordType};
			declare const records: Record[];
			declare const newIds: string[];
			const types = new Set(records.flatMap(record => newIds.includes(record._id) && record.type ? [record.type] : []));
			</script>
		`),
		vueWithTypeScriptParser(outdent`
			<script lang="ts">
			declare const array: Array<{active: boolean}>;
			array.flatMap(value => value.active ? [value] : []);
			</script>
		`),
		vueWithTypeScriptParser(outdent`
			<script lang="tsx">
			type Item = {active: boolean; id: string};
			declare const array: Item[];
			array.flatMap(value => value.active ? [value.id] : []);
			</script>
		`),
		vueWithTypeScriptParser(outdent`
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
		vueWithTypeScriptParser('<script setup lang="ts">array.flatMap(value => [value.id]);</script>'),
		vueWithTypeScriptParser('<script setup lang="tsx">array.flatMap(value => [value.id]); array.flatMap(value => value.active ? [value.id] : []);</script>'),
		{
			code: '<script>array.flatMap(value => value.active ? [value] : []);</script>',
			filename: 'file.vue',
			languageOptions: {parser: parsers.vue},
		},
		{
			code: '<script setup lang="js">array.flatMap(value => value.active ? [value.id] : []);</script>',
			filename: 'file.vue',
			languageOptions: {parser: parsers.vue},
		},
		vueWithTypeScriptParser('<script lang="js">array.flatMap(value => value.active ? [value.id] : []);</script>'),
	],
});

test.snapshot({
	valid: [
		'array.flatMap(() => [unknown]);',
		'array.flatMap(() => condition ? [[1]] : [2, 3]);',
		'array.flatMap(() => condition ? [Array.of(1)] : [2, 3]);',
		'array.flatMap(() => condition ? [...values] : [2, 3]);',
		'array.flatMap(() => condition ? [,] : [2, 3]);',
		'array.flatMap(() => { const values = [1]; return values; });',
		'array.flatMap(() => { function nested() { return [1]; } return [2, 3]; });',
		'array.flatMap(() => { const nested = () => [1]; return [2, 3]; });',
		'array.flatMap(() => { if ([1]) { return [2, 3]; } });',
		'array.flatMap(() => ({values: [1]}));',
		'array.flatMap(async () => [1]);',
		'array.flatMap(function * () { return [1]; });',
		'array.flatMap?.(() => [1]);',
		'array?.flatMap(() => [1]);',
		'array["flatMap"](() => [1]);',
		'array.flatMap(() => [1], thisArgument);',
		'new Set().flatMap(() => [1]);',
		'({flatMap(callback) { return callback(); }}).flatMap(() => [1]);',
		'const value = []; array.flatMap(() => condition ? [value] : [2, 3]);',
		'array.flatMap(callback);',
		typescript('array.flatMap((): number[] => [1]);'),
		typescript('array.flatMap(function (): number[] { return [1]; });'),
		typescript('declare const value: any; array.flatMap(() => [value]);'),
		typescript('declare const value: unknown; array.flatMap(() => [value]);'),
		typescript('declare const value: {}; array.flatMap(() => [value]);'),
		typescript('declare const value: object; array.flatMap(() => [value]);'),
		typescript('declare const value: {length: number}; array.flatMap(() => [value]);'),
		typescript('declare const value: string[]; array.flatMap(() => [value]);'),
		typescript('declare const value: readonly string[]; array.flatMap(() => [value]);'),
		typescript('declare const value: [string]; array.flatMap(() => [value]);'),
		typescript('declare const value: string | string[]; array.flatMap(() => [value]);'),
		typescript('declare const value: string | {}; array.flatMap(() => [value]);'),
		typescript('declare const value: void; array.flatMap(() => [value]);'),
		typescript('array.flatMap(() => [1] as number[]);'),
		typeAware('declare const array: (string | string[])[]; array.flatMap(value => condition ? [value] : ["a", "b"]);'),
		typeAware('declare const array: {}[]; array.flatMap(value => condition ? [value] : [1, 2]);'),
	],
	invalid: [
		'array.flatMap(() => [1]);',
		'array.flatMap(() => condition ? [1] : [2]);',
		'array.flatMap(() => condition ? [] : [1]);',
		'array.flatMap(() => condition ? (otherCondition ? [1] : [2, 3]) : [4]);',
		'array.flatMap(() => { if (condition) { return [1]; } return [2, 3]; });',
		'array.flatMap(function (value, index) { return [index + 1]; });',
		'array.flatMap(({value}, index) => condition ? [index + 1] : [value, index]);',
		'array.flatMap(() => [null]);',
		'array.flatMap(() => [true]);',
		'array.flatMap(() => [1n]);',
		'array.flatMap(() => [/expression/]);',
		outdent`array.flatMap(() => [\`value: \${value}\`]);`,
		'array.flatMap(() => [typeof value]);',
		'array.flatMap(() => [void value]);',
		'array.flatMap(() => [!value]);',
		'array.flatMap(() => [left + right]);',
		'array.flatMap(() => [{value}]);',
		'array.flatMap(() => [function () {}]);',
		'array.flatMap(() => [() => [1]]);',
		'array.flatMap(() => [class {}]);',
		'const value = 1; array.flatMap(() => condition ? [value] : [2, 3]);',
		'array.flatMap(() => [1,]);',
		'array.flatMap(() => [(1)]);',
		'array.flatMap(() => [(sideEffect(), 1)]);',
		'array.flatMap(() => ([{value}]));',
		'array.flatMap(() => [/* keep */ 1]);',
		'array.flatMap(() => [1 /* keep */]);',
		'array.flatMap(() => [{/* keep */ value}]);',
		'array.flatMap(() => [({value: 1} /* keep */)]);',
		'array.flatMap(() => { return [((/* keep */ 1 /* keep */))]; });',
		'array.flatMap(() => {return[1];});',
		'array.flatMap(() => { return [\n  1,\n]; });',
		'array.flatMap(() => {\r\n  return [\r\n    1,\r\n  ];\r\n});',
		'array.flatMap(() => condition ? [array.flatMap(() => [1])] : [2, 3]);',
		typescript('declare const value: string; array.flatMap(() => [value]);'),
		typescript('declare const value: number; array.flatMap(() => [value]);'),
		typescript('declare const value: boolean; array.flatMap(() => [value]);'),
		typescript('declare const value: bigint; array.flatMap(() => [value]);'),
		typescript('declare const value: symbol; array.flatMap(() => [value]);'),
		typescript('declare const value: string | number; array.flatMap(() => [value]);'),
		typescript('declare const value: string | undefined; array.flatMap(() => [value]);'),
		typescript('declare const value: "a" | 1 | true; array.flatMap(() => [value]);'),
		typescript('function foo(array: string[]) { return array.flatMap((value: string) => value.length > 1 ? [value] : []); }'),
		typescript('type Record = {type?: string}; declare const records: Record[]; records.flatMap(record => record.type ? [{type: record.type}] : []);'),
		typescript('array.flatMap(() => [value as string]);'),
		typescript('array.flatMap(() => [<string>value]);'),
		typescript('declare const value: string; array.flatMap(() => [value satisfies string]);'),
		typescript('declare const value: string; array.flatMap(() => [value!]);'),
		typescript('function foo(array: string[]) { return array.flatMap(value => value.length > 1 ? [value as string] : []); }'),
		typescript('array.flatMap<string>(() => condition ? ["a"] : ["b", "c"]);'),
		typeAware('declare const array: string[]; array.flatMap(value => condition ? [value] : ["a", "b"]);'),
		typeAware('declare const array: (string | number)[]; array.flatMap(value => condition ? [value] : [1, 2]);'),
		typeAware('declare const array: {type?: string}[]; array.flatMap(value => value.type ? [value.type] : []);'),
		vueWithTypeScriptParser('<script setup lang="ts">declare const value: string; array.flatMap(() => condition ? [value] : ["a", "b"]);</script>'),
		typescript('const value = "a"; declare const condition: boolean; const output = [0].flatMap(() => { if (condition) { return [value]; } return []; }); output.push("b");'),
		typeAware('declare const condition: boolean; const output = [0].flatMap(() => condition ? [1] : []); output.push(2);'),
	],
});
