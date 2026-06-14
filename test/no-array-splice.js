import {getTester} from './utils/test.js';

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
		{
			code: 'var array = []; array.splice(1, 1);',
			languageOptions: {
				sourceType: 'script',
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
	],
});
