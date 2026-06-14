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
		'array.reverse()',
		'array?.reverse()',
		'array.reverse?.()',
		'array?.reverse?.()',
		'array.reverse.call(array)',
		'array.reverse.apply(array)',
		'array.reverse.bind(array)',
		'array.reverse?.call(array)',
		'array?.reverse.call(array)',
		'Reflect.apply(array.reverse, array, [])',
		'Reflect.apply(array?.reverse, array, [])',
		'Reflect.apply?.(array.reverse, array, [])',
		'Reflect?.apply(array.reverse, array, [])',
		'array.reverse = function () {}',
		'array.reverse++',
		'delete array.reverse',
		'delete array?.reverse',
		'const method = array[methodName]',
		'const method = object.reverse',
		'const method = unknown.reverse',
		'const method = unknown.pop',
		'const method = unknown.join',
		'const method = unknown.toString',
		'const method = unknown.valueOf',
		'const method = unknown.slice',
		'const method = unknown.concat',
		'const method = arrays.reverse',
		'const method = arrayLike.reverse',
		'const method = value.toLowerCase',
		'const method = value.trim',
		'const method = value.toReversed',
		'const method = array.toLowerCase',
		'const method = string.toReversed',
		'const string = "text"; const method = string.toReversed',
		'const method = stringValue.trim',
		'const method = myString.trim',
		'const object = {}; const method = object.toLowerCase',
		'const object = {}; const method = object.trim',
		'const object = {}; const method = object.toReversed',
		'let alias = array; const method = alias.reverse',
		'var alias = string; const method = alias.trim',
		'const method = (() => {}).trim',
		'typeof value.toLowerCase === "function"',
		'typeof array.reverse === "function"',
		'typeof array?.reverse === "function"',
		'if (typeof value.trim === "function") {}',
		'const method = Array.prototype.reverse',
		'const method = String.prototype.toLowerCase',
		'const method = Array["prototype"].reverse',
		'const method = String["prototype"].toLowerCase',
		{code: 'const value: {reverse: Function} = object; const method = value.reverse', languageOptions: {parser: parsers.typescript}},
		{code: 'const value: {toLowerCase: Function} = object; const method = value.toLowerCase', languageOptions: {parser: parsers.typescript}},
		{code: 'const value: string = object; const method = value.reverse', languageOptions: {parser: parsers.typescript}},
		{code: 'const value: string[] = []; const method = value.split', languageOptions: {parser: parsers.typescript}},
		{code: '(array.reverse as () => void)()', languageOptions: {parser: parsers.typescript}},
		{code: '(array.reverse as () => void).call(array)', languageOptions: {parser: parsers.typescript}},
		{code: '(array.map<string>)()', languageOptions: {parser: parsers.typescript}},
		{code: 'Reflect.apply(array.reverse as () => void, array, [])', languageOptions: {parser: parsers.typescript}},
		{code: 'Reflect.apply(array.map<string>, array, [])', languageOptions: {parser: parsers.typescript}},
		{code: 'typeof (array.reverse as unknown) === "function"', languageOptions: {parser: parsers.typescript}},
		{code: 'typeof (array.map<string>) === "function"', languageOptions: {parser: parsers.typescript}},
		typeAware(outdent`
			declare function getObject(): {reverse: () => void};
			const method = getObject().reverse;
		`),
	],
	invalid: [
		'const method = [].reverse',
		'const method = [1, 2, 3].sort',
		'const method = Array.from(iterable).join',
		'const method = Array.of(1, 2, 3).toReversed',
		'const method = array.map',
		'const method = array.push',
		'const method = array.includes',
		'const array = []; const method = array.pop',
		'const array = Array.from(iterable); const method = array.entries',
		'const alias = array; const method = alias.shift',
		'const method = array.reverse',
		'const method = array?.reverse',
		'if (array.pop) {}',
		'function foo() { return array["reverse"]; }',
		'const method = "".toLowerCase',
		'const method = `text`.trim',
		'const string = "text"; const method = string.normalize',
		'const alias = string; const method = alias.toUpperCase',
		'const method = string.trim',
		'const method = string?.trim',
		'const method = string.includes',
		'const method = string.replace',
		'const method = string.startsWith',
		'const method = string.trimLeft',
		'const method = string.trimRight',
		'Reflect.apply(fn, array.reverse, [])',
		'Reflect.apply(fn, thisArgument, string.trim)',
		'const method = array.reverse.call',
		{code: 'const method = array!.reverse', languageOptions: {parser: parsers.typescript}},
		{code: 'const method = (array as unknown).reverse', languageOptions: {parser: parsers.typescript}},
		{code: 'const method = (array satisfies unknown).reverse', languageOptions: {parser: parsers.typescript}},
		{code: 'const method = (array.reverse as unknown)', languageOptions: {parser: parsers.typescript}},
		{code: 'const method = (array.reverse satisfies unknown)', languageOptions: {parser: parsers.typescript}},
		{code: 'const method = array.map<string>', languageOptions: {parser: parsers.typescript}},
		{code: 'const method = string!.trim', languageOptions: {parser: parsers.typescript}},
		{code: 'const method = (string satisfies unknown).trim', languageOptions: {parser: parsers.typescript}},
		{code: 'const alias = array!; const method = alias.reverse', languageOptions: {parser: parsers.typescript}},
		{code: 'const items: string[] = []; const method = items.reverse', languageOptions: {parser: parsers.typescript}},
		{code: 'const items: Array<string> = []; const method = items.join', languageOptions: {parser: parsers.typescript}},
		{code: 'const items: readonly string[] = []; const method = items.slice', languageOptions: {parser: parsers.typescript}},
		{code: 'const items: ReadonlyArray<string> = []; const method = items.slice', languageOptions: {parser: parsers.typescript}},
		{code: 'const text: string = value; const method = text.split', languageOptions: {parser: parsers.typescript}},
		{code: 'const method = (value as string[]).toSorted', languageOptions: {parser: parsers.typescript}},
		{code: 'const method = (value as string).trimStart', languageOptions: {parser: parsers.typescript}},
		typeAware(outdent`
			function getArray(): string[] {
				return [];
			}

			const method = getArray().reverse;
		`),
		typeAware(outdent`
			function getString(): string {
				return '';
			}

			const method = getString().split;
		`),
	],
});
