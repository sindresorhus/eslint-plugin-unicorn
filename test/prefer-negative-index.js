import outdent from 'outdent';
import {getTester} from './utils/test.js';
import parsers from './utils/parsers.js';

const {test} = getTester(import.meta);

const error = {
	messageId: 'prefer-negative-index',
};

const suggestion = output => ({...error, suggestions: [{messageId: 'prefer-negative-index/suggestion', output}]});

// Offsets other than `1` can exceed the receiver's length, so these conversions must stay suggestions.
test({
	valid: [],
	invalid: [
		['const array = [1, 2, 3]; array.slice(array.length - 4)', 'const array = [1, 2, 3]; array.slice(-4)'],
		['const array = [1, 2, 3]; array.at(array.length - 4)', 'const array = [1, 2, 3]; array.at(-4)'],
		['const array = [1, 2, 3]; array.splice(array.length - 4, 1)', 'const array = [1, 2, 3]; array.splice(-4, 1)'],
		['const array = [1, 2, 3]; array.toSpliced(array.length - 4, 1)', 'const array = [1, 2, 3]; array.toSpliced(-4, 1)'],
		['const array = new Uint8Array([1, 2, 3]); array.subarray(array.length - 4)', 'const array = new Uint8Array([1, 2, 3]); array.subarray(-4)'],
		['const string = "abc"; string.slice(string.length - 4)', 'const string = "abc"; string.slice(-4)'],
		// `[1].at(1 - 2)` is `1`, but `[1].at(-2)` is `undefined`
		['foo.at(foo.length - 2)', 'foo.at(-2)'],
		['array.slice(0, array.length - 4)', 'array.slice(0, -4)'],
		// Every converted argument must be `.length - 1` to autofix
		['foo.slice(foo.length - 3, foo.length - 1)', 'foo.slice(-3, -1)'],
		['Array.prototype.slice.call(array, array.length - 4)', 'Array.prototype.slice.call(array, -4)'],
		['Uint8Array.prototype.subarray.apply(array, [array.length - 4])', 'Uint8Array.prototype.subarray.apply(array, [-4])'],
	].map(([code, output]) => ({code, errors: [suggestion(output)]})),
});

test.snapshot({
	valid: [
		// Docs example (1)
		'foo.slice(-2, -1)',
		// Docs example (2)
		'foo.splice(-1, 1)',
		// Docs example (3)
		'Array.prototype.slice.call(foo, -2, -1)',
		// Docs example (4)
		'Array.prototype.slice.apply(foo, [-2, -1])',
		// A function named `slice`
		'slice(foo.length - 1)',
		// Not slice
		'foo.forEach(foo.length - 1)',
		// Not slice
		'Array.prototype.forEach.call(foo, foo.length - 1)',
		// Not Array
		'FOO.prototype.slice.apply(foo, [-2, -1])',
		// Second argument is not an array
		'Array.prototype.slice.apply(foo, "")',
		// New call
		'new Foo.forEach(Foo.length - 1)',
		// Bar.length
		'foo.slice(bar.length - 1)',
		// - NOT_POSITIVE_VALUE
		'foo.slice(foo.length - 0)',
		// - NOT_INTEGER
		// `slice(length - n)` and `slice(-n)` only agree for a whole number of elements
		'foo.slice(foo.length - 0.5)',
		'foo.slice(foo.length - 1.5)',
		'foo.at(foo.length - 0.5)',
		'foo.splice(foo.length - 1.5, 1)',
		'foo[foo.length - 0.5]',
		// - NOT_NUMBER
		'foo.slice(foo.length - "1")',
		// - NOT_LITERAL
		'foo.slice(foo.length - (-1))',
		// + BinaryExpression
		'foo.slice(foo.length + 1)',
		// Has + BinaryExpression
		'foo.slice(foo.length - 2 + 1)',
		// Has + BinaryExpression
		'foo.slice((foo.length - 1) + 1)',
		// Has / BinaryExpression
		'foo.slice(foo.length - 1 / 1)',
		// ArrayExpression
		'[1, 2, 3].slice([1, 2, 3].length - 1)',
		// Foo[bar++]
		'foo[bar++].slice(foo[bar++].length - 1)',
		// Foo[a + b]
		'foo[a + b].slice(foo[a + b].length - 1)',
		// eslint-disable-next-line no-template-curly-in-string
		'foo[`${bar}`].slice(foo[`${bar}`].length - 1)',
		// Should not crash
		// https://github.com/gatsbyjs/gatsby/blob/e720d8efe58eba0f6fae9f26ec8879128967d0b5/packages/gatsby/src/bootstrap/log-line-function.js#L9
		'function foo() {return [].slice.apply(arguments);}',
		// Not `[]`, `''`, or a supported prototype
		// There is no `{String,ArrayBuffer,TypedArray}#splice`
		'[NOT_EMPTY].slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'[NOT_EMPTY].splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'[NOT_EMPTY].slice.call(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'[NOT_EMPTY].splice.call(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'\'\'.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'\'\'.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'\'NOT_EMPTY\'.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'\'NOT_EMPTY\'.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'\'NOT_EMPTY\'.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'\'NOT_EMPTY\'.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'String.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'ArrayBuffer.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Int8Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Uint8Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Uint8ClampedArray.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Int16Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Uint16Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Int32Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Uint32Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Float16Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Float32Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Float64Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'BigInt64Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'BigUint64Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'NOT_SUPPORTED.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'NOT_SUPPORTED.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'String.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'ArrayBuffer.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Int8Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Uint8Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Uint8ClampedArray.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Int16Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Uint16Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Int32Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Uint32Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Float16Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Float32Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Float64Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'BigInt64Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'BigUint64Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'NOT_SUPPORTED.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'NOT_SUPPORTED.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
	],
	invalid: [
		// Docs example (1)
		'foo.slice(foo.length - 2, foo.length - 1)',
		// Docs example (2)
		'foo.splice(foo.length - 1, 1)',
		// Docs example (3)
		'Array.prototype.slice.call(foo, foo.length - 2, foo.length - 1)',
		// Docs example (4)
		'Array.prototype.slice.apply(foo, [foo.length - 2, foo.length - 1])',
		// Nested
		'foo.slice(foo.length - 1 - 1)',
		// Foo.bar
		'foo.bar.slice(foo.bar.length - 1)',
		// Foo['bar']
		'foo[\'bar\'].slice(foo[\'bar\'].length - 1)',
		// Foo[1]
		'foo[1].slice(foo[1].length - 1)',
		// Comment
		'foo.slice(foo.length/* comment */ - 1)',
		// Comment
		outdent`
			foo.slice(
				// comment 1

				foo.length

				// comment 2
				- 1
				-1
				,
				foo.length // comment 3
				- 1
			)
		`,
		// Parentheses
		'foo.slice((((foo.length)) - 1) - 1)',
		// Comment inside parentheses
		'foo.slice(/* will keep */(/* will keep 1 */(/* will remove 2 */(foo.length)) - 1) - 1)',
		// [].{slice,splice}
		// ''.slice
		// {Array,String...}.prototype.slice.{call,apply}
		// Array.prototype.splice.{call,apply}
		'[].slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'[].splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'[].slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'[].splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'\'\'.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'\'\'.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'String.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'ArrayBuffer.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Int8Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Uint8Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Uint8ClampedArray.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Int16Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Uint16Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Int32Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Uint32Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Float16Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Float32Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Float64Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'BigInt64Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'BigUint64Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);',
		'Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'String.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'ArrayBuffer.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Int8Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Uint8Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Uint8ClampedArray.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Int16Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Uint16Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Int32Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Uint32Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Float16Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Float32Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'Float64Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'BigInt64Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
		'BigUint64Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);',
	],
});

test.snapshot({
	valid: [
		// There is no `String#{toSpliced,with}`
		'String.prototype.toSpliced.call(foo, foo.length - 1)',
		'String.prototype.with.call(foo, foo.length - 1)',
		// There is no `TypedArray#toSpliced`
		'Uint8Array.prototype.toSpliced.call(foo, foo.length - 1)',
		// There is no `Array#subarray`
		'Array.prototype.subarray.call(foo, foo.length - 1)',
		// `with()` changes boundary behavior for short arrays.
		'foo.with(foo.length - 3, foo.length - 6)',
		'Array.prototype.with.call(foo, foo.length - 3, foo.length - 6)',
	],
	invalid: [
		'/**/foo.slice(foo.length - 2, foo.length - 1)',
		'/**/foo.splice(foo.length - 1, 1)',
		// Foo.bar and foo["bar"]
		'foo.bar.slice(foo["bar"].length - 1)',
		// Foo[`bar`] and foo["bar"]
		'foo[`bar`].slice(foo["bar"].length - 1)',
		// Foo[1] and foo["1"]
		'foo[1].slice(foo["1"].length - 1)',
		// Foo['bar'] & foo["bar"]
		'foo[\'bar\'].slice(foo["bar"].length - 1)',
		outdent`
			foo.at(foo.length - 1);
			Array.prototype.at.call(foo, foo.length - 2);
			Array.prototype.at.apply(foo, [foo.length - 3]);
		`,
		'foo.toSpliced(foo.length - 3, foo.length - 6)',
		'Array.prototype.toSpliced.call(foo, foo.length - 3, foo.length - 6)',
		'[].toSpliced.call(foo, foo.length - 3, foo.length - 6)',
		'foo.subarray(foo.length - 3, foo.length - 6)',
		'Uint8Array.prototype.subarray.call(foo, foo.length - 3, foo.length - 6)',
		'Uint8Array.prototype.subarray.apply(foo, [foo.length - 3, foo.length - 6])',
		{
			code: '(foo as string[]).slice((foo as string[]).length - 1)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(array as number[]).splice((array as number[]).length - 2, 1)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'Array.prototype.slice.call(foo as any[], (foo as any[]).length - 1)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo!.slice(foo!.length - 1)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(foo satisfies string[]).slice((foo satisfies string[]).length - 1)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo.slice((foo.length satisfies number) - 1)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo.slice((foo.length - 1) as number)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo.slice(foo.length - (1 as const))',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array!.splice(array!.length - 2, 1)',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

// A comment inside the `.length` access would be lost by the fix
test({
	valid: [],
	invalid: [
		{
			code: 'foo.slice(foo /* keep */ .length - 1)',
			errors: 1,
		},
		{
			code: 'foo.slice(foo /* keep */ .length - 2)',
			errors: [{...error, suggestions: []}],
		},
		{
			// The comment sits before the whole expression, it is kept
			code: 'foo.slice(/* keep */ foo.length - 1)',
			output: 'foo.slice(/* keep */ -1)',
			errors: 1,
		},
	],
});

// A comment inside the removed `.length` access or its parentheses would be lost
test({
	valid: [],
	invalid: [
		{
			code: 'foo.slice(((/* keep */(foo.length)) - 1) - 1)',
			errors: [{...error, suggestions: []}],
		},
	],
});

// The space after the produced operator must go, `foo.length - 1` is `-1`
test({
	valid: [],
	invalid: [
		...[
			['foo.slice(foo.length - 1)', 'foo.slice(-1)'],
			['foo.at(foo.length - 1)', 'foo.at(-1)'],
			['foo.subarray(foo.length - 1)', 'foo.subarray(-1)'],
			['foo.toSpliced(foo.length - 1, 1)', 'foo.toSpliced(-1, 1)'],
			['foo.slice(foo.length  -  1)', 'foo.slice(-1)'],
		].map(([code, output]) => ({code, output, errors: 1})),
		{
			code: 'foo.slice((((foo.length)) - 1) - 1)',
			errors: [suggestion('foo.slice((-1) - 1)')],
		},
	],
});
