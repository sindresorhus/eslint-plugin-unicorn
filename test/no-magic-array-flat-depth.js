import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Known non-array receiver (type information)
		{
			code: 'function f(foo: {flat(depth: number): void}) { foo.flat(2); }',
			languageOptions: {parser: parsers.typescript},
		},
		'array.flat(1)',
		'array.flat(1.0)',
		'array.flat(0x01)',
		'array.flat(unknown)',
		'array.flat(Number.POSITIVE_INFINITY)',
		'array.flat(Infinity)',
		'array.flat(/* explanation */2)',
		'array.flat(2/* explanation */)',
		'array.flat()',
		'array.flat(2, extraArgument)',
		'new array.flat(2)',
		'array.flat?.(2)',
		'array.notFlat(2)',
		'flat(2)',
	],
	invalid: [
		'array.flat(2)',
		'array?.flat(2)',
		'array.flat(99,)',
		'array.flat(0b10,)',
		// A receiver that is known to be an array must still be reported
		{
			code: 'function f(foo: number[][]) { foo.flat(2); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
