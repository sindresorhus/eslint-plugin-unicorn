import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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
