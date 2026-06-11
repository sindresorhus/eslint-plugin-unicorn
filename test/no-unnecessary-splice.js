import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'array.splice(index, 1);',
		'array.splice(index, 2);',
		'array.splice(index, 1, element);',
		'array.splice(1, 0, element);',
		'array.splice(0, 2);',
		'array.splice(0, 1, element);',
		'array.splice(array.length - 2, 1);',
		'array.splice(array.length - 1, 0, element);',
		'array.splice(otherArray.length - 1, 1);',
		'array.splice(otherArray.length, 0, element);',
		'array.splice(1, array.length);',
		'array["splice"](0, 1);',
		'array[splice](0, 1);',
		'array?.splice(0, 1);',
		'array.splice?.(0, 1);',
		'array.toSpliced(0, 1);',
	],
	invalid: [
		'array.splice();',
		'array.splice(index, 0);',
		'array.splice(index, -1);',
		'array.splice(0, 1);',
		'array.splice(0, 0, element);',
		'array.splice(0, 0, element, ...moreElements);',
		'array.splice(array.length - 1, 1);',
		'object.array.splice(object.array.length - 1, 1);',
		'array.splice(array.length, 0, element);',
		'array.splice(array.length, 0, element, ...moreElements);',
		'object.array.splice(object.array.length, 0, element);',
		'array.splice(0);',
		'object.array.splice(0);',
		'array.splice(0, array.length);',
		'object.array.splice(0, object.array.length);',
		'const result = array.splice(index, 0);',
		'const result = array.splice(0, 1);',
		'const result = array.splice(0, 0, element);',
		'const result = array.splice(array.length - 1, 1);',
		'const result = array.splice(array.length, 0, element);',
		'const result = array.splice(0);',
		'array.splice(0, /* comment */ 0, element);',
		'array.splice(/* comment */ 0, 1);',
		'getArray().splice(index, 0);',
		'array.splice(getIndex(), 0);',
		'if (condition) array.splice(index, 0);',
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'array.splice(0 as const, 2);',
	],
	invalid: [
		'array.splice(0 as const, 1 as const);',
		'array.splice(<number>0, <number>0, element);',
		'array.splice(array.length - 1!, 1!);',
		'array.splice(0!, array.length);',
	],
});
