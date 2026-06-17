import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Known non-array receiver (type information)
		{
			code: 'function f(foo: Set<number>) { foo.shift(); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(foo: Set<number>) { foo.unshift(value); }',
			languageOptions: {parser: parsers.typescript},
		},
		'array.shift',
		'array.unshift',
		'array.shift?.()',
		'array.unshift?.(value)',
		'array?.shift?.()',
		'array?.unshift?.(value)',
		'array["shift"]()',
		'array["unshift"](value)',
		'shift(array)',
		'unshift(array, value)',
		'Array.prototype.shift.call(array)',
		'Array.prototype.unshift.call(array, value)',
		'stream.unshift(chunk)',
		'this.unshift(chunk)',
		'this.stream.unshift(chunk)',
		'process.stdin.unshift(chunk)',
		'process.stdout.unshift(chunk)',
		'process.stderr.unshift(chunk)',
	],
	invalid: [
		'array.shift()',
		'array.shift(extraArgument)',
		'array?.shift()',
		'array.unshift()',
		'array.unshift(value)',
		'array.unshift(...values)',
		'array?.unshift(value)',
		'stream.shift()',
		'const item = array.shift()',
		'const length = array.unshift(value)',
		'function getItem() { return array.shift(); }',
		'while (array.shift()) {}',
		'if (array.unshift(value)) {}',
		'for (; array.shift(); ) {}',
		{
			code: '(array as string[]).shift()',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array!.unshift(value)',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
