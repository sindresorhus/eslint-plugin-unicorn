import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const error = {
	messageId: 'prefer-negative-index',
};

test({
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
		// Second argument is not a array
		'Array.prototype.slice.apply(foo, "")',
		// New call
		'new Foo.forEach(Foo.length - 1)',
		// Bar.length
		'foo.slice(bar.length - 1)',
		// - NOT_POSITIVE_VALUE
		'foo.slice(foo.length - 0)',
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
	],
	invalid: [
		// Docs example (1)
		{
			code: 'foo.slice(foo.length - 2, foo.length - 1)',
			errors: [error],
			output: 'foo.slice(- 2, - 1)',
		},
		// Docs example (2)
		{
			code: 'foo.splice(foo.length - 1, 1)',
			errors: [error],
			output: 'foo.splice(- 1, 1)',
		},
		// Docs example (3)
		{
			code: 'Array.prototype.slice.call(foo, foo.length - 2, foo.length - 1)',
			errors: [error],
			output: 'Array.prototype.slice.call(foo, - 2, - 1)',
		},
		// Docs example (4)
		{
			code: 'Array.prototype.slice.apply(foo, [foo.length - 2, foo.length - 1])',
			errors: [error],
			output: 'Array.prototype.slice.apply(foo, [- 2, - 1])',
		},
		// Nested
		{
			code: 'foo.slice(foo.length - 1 - 1)',
			errors: [error],
			output: 'foo.slice(- 1 - 1)',
		},
		// Foo.bar
		{
			code: 'foo.bar.slice(foo.bar.length - 1)',
			errors: [error],
			output: 'foo.bar.slice(- 1)',
		},
		// Foo['bar']
		{
			code: 'foo[\'bar\'].slice(foo[\'bar\'].length - 1)',
			errors: [error],
			output: 'foo[\'bar\'].slice(- 1)',
		},
		// Foo[1]
		{
			code: 'foo[1].slice(foo[1].length - 1)',
			errors: [error],
			output: 'foo[1].slice(- 1)',
		},
		// Comment
		{
			code: 'foo.slice(foo.length/* comment */ - 1)',
			errors: [error],
			output: 'foo.slice(/* comment */ - 1)',
		},
		// Comment
		{
			code: outdent`
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
			errors: [error],
			output: outdent`
				foo.slice(
					// comment 1

					// comment 2
					- 1
					-1
					,
					// comment 3
					- 1
				)
			`,
		},
		// Parentheses
		{
			code: 'foo.slice((((foo.length)) - 1) - 1)',
			errors: [error],
			output: 'foo.slice((- 1) - 1)',
		},
		// Comment inside parentheses
		{
			code: 'foo.slice(/* will keep */(/* will keep 1 */(/* will remove 2 */(foo.length)) - 1) - 1)',
			errors: [error],
			output: 'foo.slice(/* will keep */(/* will keep 1 */- 1) - 1)',
		},
		// [].{slice,splice}
		{
			code: outdent`
				[].slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				[].splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				[].slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				[].splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				[NOT_EMPTY].slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				[NOT_EMPTY].splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				[NOT_EMPTY].slice.call(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				[NOT_EMPTY].splice.call(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
			`,
			errors: Array.from({length: 4}, () => error),
			output: outdent`
				[].slice.call(foo, - 1, - 2, foo.length - 3);
				[].splice.call(foo, - 1, foo.length - 2, foo.length - 3);
				[].slice.apply(foo, [- 1, - 2, foo.length - 3]);
				[].splice.apply(foo, [- 1, foo.length - 2, foo.length - 3]);
				[NOT_EMPTY].slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				[NOT_EMPTY].splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				[NOT_EMPTY].slice.call(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				[NOT_EMPTY].splice.call(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
			`,
		},
		// ''.slice
		{
			code: outdent`
				''.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				''.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				''.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				''.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				'NOT_EMPTY'.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				'NOT_EMPTY'.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				'NOT_EMPTY'.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				'NOT_EMPTY'.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
			`,
			errors: Array.from({length: 2}, () => error),
			output: outdent`
				''.slice.call(foo, - 1, - 2, foo.length - 3);
				''.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				''.slice.apply(foo, [- 1, - 2, foo.length - 3]);
				''.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				'NOT_EMPTY'.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				'NOT_EMPTY'.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				'NOT_EMPTY'.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				'NOT_EMPTY'.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
			`,
		},
		// {Array,String...}.prototype.slice.call
		// Array.prototype.splice.call
		{
			code: outdent`
				Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				String.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				String.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				ArrayBuffer.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				ArrayBuffer.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Int8Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Int8Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Uint8Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Uint8Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Uint8ClampedArray.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Uint8ClampedArray.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Int16Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Int16Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Uint16Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Uint16Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Int32Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Int32Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Uint32Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Uint32Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Float32Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Float32Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Float64Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Float64Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				BigInt64Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				BigInt64Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				BigUint64Array.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				BigUint64Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				NOT_SUPPORTED.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				NOT_SUPPORTED.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
			`,
			errors: Array.from({length: 15}, () => error),
			output: outdent`
				Array.prototype.slice.call(foo, - 1, - 2, foo.length - 3);
				Array.prototype.splice.call(foo, - 1, foo.length - 2, foo.length - 3);
				String.prototype.slice.call(foo, - 1, - 2, foo.length - 3);
				String.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				ArrayBuffer.prototype.slice.call(foo, - 1, - 2, foo.length - 3);
				ArrayBuffer.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Int8Array.prototype.slice.call(foo, - 1, - 2, foo.length - 3);
				Int8Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Uint8Array.prototype.slice.call(foo, - 1, - 2, foo.length - 3);
				Uint8Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Uint8ClampedArray.prototype.slice.call(foo, - 1, - 2, foo.length - 3);
				Uint8ClampedArray.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Int16Array.prototype.slice.call(foo, - 1, - 2, foo.length - 3);
				Int16Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Uint16Array.prototype.slice.call(foo, - 1, - 2, foo.length - 3);
				Uint16Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Int32Array.prototype.slice.call(foo, - 1, - 2, foo.length - 3);
				Int32Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Uint32Array.prototype.slice.call(foo, - 1, - 2, foo.length - 3);
				Uint32Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Float32Array.prototype.slice.call(foo, - 1, - 2, foo.length - 3);
				Float32Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				Float64Array.prototype.slice.call(foo, - 1, - 2, foo.length - 3);
				Float64Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				BigInt64Array.prototype.slice.call(foo, - 1, - 2, foo.length - 3);
				BigInt64Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				BigUint64Array.prototype.slice.call(foo, - 1, - 2, foo.length - 3);
				BigUint64Array.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				NOT_SUPPORTED.prototype.slice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
				NOT_SUPPORTED.prototype.splice.call(foo, foo.length - 1, foo.length - 2, foo.length - 3);
			`,
		},
		// {Array,String...}.prototype.slice.apply
		// Array.prototype.splice.apply
		{
			code: outdent`
				Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				String.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				String.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				ArrayBuffer.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				ArrayBuffer.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Int8Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Int8Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Uint8Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Uint8Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Uint8ClampedArray.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Uint8ClampedArray.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Int16Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Int16Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Uint16Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Uint16Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Int32Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Int32Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Uint32Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Uint32Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Float32Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Float32Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Float64Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Float64Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				BigInt64Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				BigInt64Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				BigUint64Array.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				BigUint64Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				NOT_SUPPORTED.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				NOT_SUPPORTED.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
			`,
			errors: Array.from({length: 15}, () => error),
			output: outdent`
				Array.prototype.slice.apply(foo, [- 1, - 2, foo.length - 3]);
				Array.prototype.splice.apply(foo, [- 1, foo.length - 2, foo.length - 3]);
				String.prototype.slice.apply(foo, [- 1, - 2, foo.length - 3]);
				String.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				ArrayBuffer.prototype.slice.apply(foo, [- 1, - 2, foo.length - 3]);
				ArrayBuffer.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Int8Array.prototype.slice.apply(foo, [- 1, - 2, foo.length - 3]);
				Int8Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Uint8Array.prototype.slice.apply(foo, [- 1, - 2, foo.length - 3]);
				Uint8Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Uint8ClampedArray.prototype.slice.apply(foo, [- 1, - 2, foo.length - 3]);
				Uint8ClampedArray.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Int16Array.prototype.slice.apply(foo, [- 1, - 2, foo.length - 3]);
				Int16Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Uint16Array.prototype.slice.apply(foo, [- 1, - 2, foo.length - 3]);
				Uint16Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Int32Array.prototype.slice.apply(foo, [- 1, - 2, foo.length - 3]);
				Int32Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Uint32Array.prototype.slice.apply(foo, [- 1, - 2, foo.length - 3]);
				Uint32Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Float32Array.prototype.slice.apply(foo, [- 1, - 2, foo.length - 3]);
				Float32Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				Float64Array.prototype.slice.apply(foo, [- 1, - 2, foo.length - 3]);
				Float64Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				BigInt64Array.prototype.slice.apply(foo, [- 1, - 2, foo.length - 3]);
				BigInt64Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				BigUint64Array.prototype.slice.apply(foo, [- 1, - 2, foo.length - 3]);
				BigUint64Array.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				NOT_SUPPORTED.prototype.slice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
				NOT_SUPPORTED.prototype.splice.apply(foo, [foo.length - 1, foo.length - 2, foo.length - 3]);
			`,
		},
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
	],
	invalid: [
		'foo.slice(foo.length - 2, foo.length - 1)',
		'foo.splice(foo.length - 1, 1)',
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
		'foo.with(foo.length - 3, foo.length - 6)',
		'Array.prototype.with.call(foo, foo.length - 3, foo.length - 6)',
		'foo.subarray(foo.length - 3, foo.length - 6)',
		'Uint8Array.prototype.subarray.call(foo, foo.length - 3, foo.length - 6)',
		'Uint8Array.prototype.subarray.apply(foo, [foo.length - 3, foo.length - 6])',
	],
});
