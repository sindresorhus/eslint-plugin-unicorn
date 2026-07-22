import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Known non-array receiver (type information)
		{
			code: 'function f(foo: {flat(depth: number): void}) { foo.flat(1); }',
			languageOptions: {parser: parsers.typescript},
		},
		'foo.flat()',
		'foo.flat?.(1)',
		'foo?.flat()',
		'foo.flat(1, extra)',
		'flat(1)',
		'new foo.flat(1)',
		'const ONE = 1; foo.flat(ONE)',
		'foo.notFlat(1)',
	],
	invalid: [
		'foo.flat(1)',
		'foo.flat(1.0)',
		'foo.flat(0b01)',
		'foo?.flat(1)',
		// A receiver that is known to be an array must still be reported
		{
			code: 'function f(foo: number[][]) { foo.flat(1); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
