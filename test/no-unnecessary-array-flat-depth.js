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

// A trailing comma must not take the comments of the only argument with it
test({
	valid: [],
	invalid: [
		{
			code: 'foo.flat((1 /* comment */),);',
			output: 'foo.flat( /* comment */);',
			errors: 1,
		},
		{
			code: 'foo.flat((1 // comment\n),);',
			output: 'foo.flat( // comment\n);',
			errors: 1,
		},
		// The whole argument list goes, including the whitespace it was written with
		{
			code: 'foo.flat(1, )',
			output: 'foo.flat()',
			errors: 1,
		},
		{
			code: 'foo.flat(\n\t1,\n)',
			output: 'foo.flat()',
			errors: 1,
		},
		{
			code: 'foo.flat(\n\t1\n).map(callback)',
			output: 'foo.flat().map(callback)',
			errors: 1,
		},
		// A comment outside the argument list does not matter
		{
			code: 'foo /* comment */ .flat(\n\t1,\n)',
			output: 'foo /* comment */ .flat()',
			errors: 1,
		},
		{
			code: 'foo.flat<number[]>(\n\t1,\n)',
			output: 'foo.flat<number[]>()',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
	],
});
