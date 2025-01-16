
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// The global object that not define in ECMAScript
		'foo instanceof Worker',
	],
	invalid: [
		// Primitive types
		'foo instanceof String',
		'foo instanceof Number',
		'foo instanceof Boolean',
		'foo instanceof BigInt',
		'foo instanceof Symbol',

		// Reference types
		'foo instanceof Object',
		'foo instanceof Function',
		'foo instanceof RegExp',
		'foo instanceof Date',
		'foo instanceof Error',
		'foo instanceof Promise',
		'foo instanceof Map',
		'foo instanceof Set',
		'foo instanceof WeakMap',
		'foo instanceof WeakSet',
		'foo instanceof ArrayBuffer',
		'foo instanceof SharedArrayBuffer',
		'foo instanceof DataView',
		'foo instanceof Array',

		// Test comments
		'foo /** before */ instanceof /** after */ String',
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
