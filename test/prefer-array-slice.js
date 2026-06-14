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
		'array.splice(index)',
		'array.splice(index, 1)[0]',
		'array.splice(index, deleteCount)[0]',
		'array.splice(index).shift()',
		'array.splice(index).length',
		'array.splice(index).at()',
		'array.splice(index).at(0, extra)',
		'array.splice(index)[0] = value',
		'array.splice(index)["length"] = value',
		'delete array.splice(index)[0]',
		'array["splice"](index)[0]',
		'array[splice](index)[0]',
		'array?.splice(index)[0]',
		'array.splice?.(index)[0]',
		'splice(index)[0]',
		'const object = {splice() { return []; }}; object.splice(index)[0]',
		'({splice() { return []; }}).splice(index)[0]',
		'class Custom { splice() { return []; } method() { return this.splice(0)[0]; } }',
		'class ArraySubclass extends Array { static method() { return this.splice(0)[0]; } }',
	],
	invalid: [
		'process.argv.splice(2)[0]',
		'array.splice(index)[0]',
		'array.splice(index)[offset]',
		'array.splice(index).at(0)',
		'object.array.splice(index)[0]',
		'array.splice(/* comment */ index)[0]',
		'const array = []; array.splice(index)[0]',
		'class ArraySubclass extends Array {} new ArraySubclass().splice(0)[0]',
		'class ArraySubclass extends Array {} const array = new ArraySubclass(); array.splice(0)[0]',
		'class ArraySubclass extends Array { method() { return this.splice(0)[0]; } }',
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'array.splice(index, 1 as const)[0]',
		'(array as string[])?.splice(index)[0]',
		'declare const set: Set<string>; set.splice(index)[0]',
		'declare const string: string; string.splice(index)[0]',
		'interface Custom { splice(index: number): string[]; } declare const value: Custom; value.splice(index)[0]',
	],
	invalid: [
		'array.splice(index as number)[0]',
		'array.splice(<number>index)[0]',
		'array.splice(index!)[0]',
		'array.splice(index satisfies number)[0]',
		'(array as string[]).splice(index)[0]',
		'declare const array: string[]; array.splice(index)[0]',
		'type Strings = string[]; declare const array: Strings; array.splice(index)[0]',
		'declare const value: unknown; value.splice(index)[0]',
		'class ArraySubclass extends Array<number> {} const array = new ArraySubclass(); array.splice(0)[0]',
	],
});

test.snapshot({
	valid: [
		typeAware('class Custom { splice() { return [1]; } } function getValue(): Custom { return new Custom(); } const value = getValue(); value.splice(0)[0]'),
		typeAware('interface Custom { splice(index: number): string[]; } function getValue(): string[] | Custom { return []; } const value = getValue(); value.splice(0)[0]'),
	],
	invalid: [
		typeAware('function getArray(): string[] { return []; } const array = getArray(); array.splice(0)[0]'),
		typeAware('class ArraySubclass extends Array<number> {} const array = new ArraySubclass(); array.splice(0)[0]'),
	],
});
