import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const looseStrategyInvalid = [
	// Primitive types
	'foo instanceof String',
	'foo instanceof Number',
	'foo instanceof Boolean',
	'foo instanceof BigInt',
	'foo instanceof Symbol',
	'foo instanceof Function',
	'foo instanceof Array',
];

const strictStrategyInvalid = [
	// Error types
	'foo instanceof Error',
	'foo instanceof EvalError',
	'foo instanceof RangeError',
	'foo instanceof ReferenceError',
	'foo instanceof SyntaxError',
	'foo instanceof TypeError',
	'foo instanceof URIError',
	'foo instanceof InternalError',
	'foo instanceof AggregateError',
	'foo instanceof SuppressedError',

	// Collection types
	'foo instanceof Map',
	'foo instanceof Set',
	'foo instanceof WeakMap',
	'foo instanceof WeakRef',
	'foo instanceof WeakSet',

	// Arrays and Typed Arrays
	'foo instanceof ArrayBuffer',
	'foo instanceof Int8Array',
	'foo instanceof Uint8Array',
	'foo instanceof Uint8ClampedArray',
	'foo instanceof Int16Array',
	'foo instanceof Uint16Array',
	'foo instanceof Int32Array',
	'foo instanceof Uint32Array',
	'foo instanceof Float16Array',
	'foo instanceof Float32Array',
	'foo instanceof Float64Array',
	'foo instanceof BigInt64Array',
	'foo instanceof BigUint64Array',

	// Data types
	'foo instanceof Object',

	// Regular Expressions
	'foo instanceof RegExp',

	// Async and functions
	'foo instanceof Promise',
	'foo instanceof Proxy',

	// Other
	'foo instanceof DataView',
	'foo instanceof Date',
	'foo instanceof SharedArrayBuffer',
	'foo instanceof FinalizationRegistry',
];

// Loose strategy
test.snapshot({
	valid: [
		'foo instanceof WebWorker',
		...strictStrategyInvalid,
	].map(code => code.replace('foo', 'fooLoose')),
	invalid: looseStrategyInvalid,
});

// Strict strategy
test.snapshot({
	valid: [],
	invalid: [...looseStrategyInvalid, ...strictStrategyInvalid].map(code => ({code: code.replace('foo', 'fooStrict'), options: [{strategy: 'strict'}]})),
});

// UseErrorIsError option with loose strategy
test.snapshot({
	valid: [],
	invalid: [
		'fooErr instanceof Error',
		'(fooErr) instanceof (Error)',
	].map(code => ({code, options: [{useErrorIsError: true, strategy: 'loose'}]})),
});

// UseErrorIsError option with strict strategy
test.snapshot({
	valid: [],
	invalid: [
		'err instanceof Error',
		'err instanceof EvalError',
		'err instanceof RangeError',
		'err instanceof ReferenceError',
		'err instanceof SyntaxError',
		'err instanceof TypeError',
		'err instanceof URIError',
		'err instanceof InternalError',
		'err instanceof AggregateError',
		'err instanceof SuppressedError',
	].map(code => ({code, options: [{useErrorIsError: true, strategy: 'strict'}]})),
});

test.snapshot({
	valid: [
		// Exclude the specified constructors
		{
			code: 'fooExclude instanceof Function',
			options: [{exclude: ['Function']}],
		},
		{
			code: 'fooExclude instanceof Array',
			options: [{exclude: ['Array']}],
		},
		{
			code: 'fooExclude instanceof String',
			options: [{exclude: ['String']}],
		},
	],
	invalid: [
		// Include the specified constructors
		{
			code: 'fooInclude instanceof WebWorker',
			options: [{include: ['WebWorker']}],
		},
		{
			code: 'fooInclude instanceof HTMLElement',
			options: [{include: ['HTMLElement']}],
		},
	],
});

// Port from no-instanceof-array
test.snapshot({
	valid: [
		'Array.isArray(arr)',
		'arr instanceof array',
		'a instanceof \'array\'',
		'a instanceof ArrayA',
		'a.x[2] instanceof foo()',
		'Array.isArray([1,2,3]) === true',
		'"arr instanceof Array"',
	],
	invalid: [
		// Port from no-instanceof-array
		'arr instanceof Array',
		'[] instanceof Array',
		'[1,2,3] instanceof Array === true',
		'fun.call(1, 2, 3) instanceof Array',
		'obj.arr instanceof Array',
		'foo.bar[2] instanceof Array',
		'(0, array) instanceof Array',
		'function foo(){return[]instanceof Array}',
		outdent`
			(
				// comment
				((
					// comment
					(
						// comment
						foo
						// comment
					)
					// comment
				))
				// comment
			)
			// comment before instanceof\r      instanceof

			// comment after instanceof

			(
				// comment

				(

					// comment

					Array

					// comment
				)

					// comment
			)

				// comment
		`,
		...[
			'<template><div v-if="array instanceof Array" v-for="element of array"></div></template>',
			'<template><div v-if="(( (( array )) instanceof (( Array )) ))" v-for="element of array"></div></template>',
			'<template><div>{{(( (( array )) instanceof (( Array )) )) ? array.join(" | ") : array}}</div></template>',
			'<script>const foo = array instanceof Array</script>',
			'<script>const foo = (( (( array )) instanceof (( Array )) ))</script>',
			'<script>foo instanceof Function</script>',
		].map(code => ({code, languageOptions: {parser: parsers.vue}})),
	],
});
