import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

// `array.flatMap(x => x)`
test.snapshot({
	valid: [
		'array.flatMap',
		'new array.flatMap(x => x)',
		'flatMap(x => x)',
		'array.notFlatMap(x => x)',
		'array[flatMap](x => x)',
		'array.flatMap(x => x, thisArgument)',
		'array.flatMap(...[x => x])',
		'array.flatMap(function (x) { return x; })', // Can be detected
		'array.flatMap(async x => x)',
		'array.flatMap(function * (x) { return x;})',
		'array.flatMap(() => x)',
		'array.flatMap((x, y) => x)',
		'array.flatMap((x) => { return x; })', // Can be detected
		'array.flatMap(x => y)'
	],
	invalid: [
		'array.flatMap(x => x)'
	]
});

// `array.reduce((a, b) => a.concat(b), [])`
test.snapshot({
	valid: [
		'new array.reduce((a, b) => a.concat(b), [])',
		'array.reduce',
		'reduce((a, b) => a.concat(b), [])',
		'array[reduce]((a, b) => a.concat(b), [])',
		'array.notReduce((a, b) => a.concat(b), [])',
		'array.reduce((a, b) => a.concat(b), [], EXTRA_ARGUMENT)',
		'array.reduce((a, b) => a.concat(b), NOT_EMPTY_ARRAY)',
		'array.reduce((a, b, extraParameter) => a.concat(b), [])',
		'array.reduce((a,) => a.concat(b), [])',
		'array.reduce(() => a.concat(b), [])',
		'array.reduce((a, b) => {return a.concat(b); }, [])', // Can be detected
		'array.reduce(function (a, b) { return a.concat(b); }, [])', // Can be detected
		'array.reduce((a, b) => b.concat(b), [])',
		'array.reduce((a, b) => a.concat(a), [])',
		'array.reduce((a, b) => b.concat(a), [])',
		'array.reduce((a, b) => a.notConcat(b), [])',
		'array.reduce((a, b) => a.concat, [])'
	],
	invalid: [
		'array.reduce((a, b) => a.concat(b), [])'
	]
});

// `array.reduce((a, b) => [...a, ...b], [])`
test.snapshot({
	valid: [
		'new array.reduce((a, b) => [...a, ...b], [])',
		'array[reduce]((a, b) => [...a, ...b], [])',
		'reduce((a, b) => [...a, ...b], [])',
		'array.notReduce((a, b) => [...a, ...b], [])',
		'array.reduce((a, b) => [...a, ...b], [], EXTRA_ARGUMENT)',
		'array.reduce((a, b) => [...a, ...b], NOT_EMPTY_ARRAY)',
		'array.reduce((a, b, extraParameter) => [...a, ...b], [])',
		'array.reduce((a,) => [...a, ...b], [])',
		'array.reduce(() => [...a, ...b], [])',
		'array.reduce((a, b) => {return [...a, ...b]; }, [])', // Can be detected
		'array.reduce(function (a, b) { return [...a, ...b]; }, [])', // Can be detected
		'array.reduce((a, b) => [...b, ...b], [])',
		'array.reduce((a, b) => [...a, ...a], [])',
		'array.reduce((a, b) => [...b, ...a], [])',
		'array.reduce((a, b) => [a, ...b], [])',
		'array.reduce((a, b) => [...a, b], [])',
		'array.reduce((a, b) => [a, b], [])',
		'array.reduce((a, b) => [...a, ...b, c], [])',
		'array.reduce((a, b) => [...a, ...b,,], [])',
		'array.reduce((a, b) => [,...a, ...b], [])'
	],
	invalid: [
		'array.reduce((a, b) => [...a, ...b], [])',
		'array.reduce((a, b) => [...a, ...b,], [])'
	]
});

// `[].concat(array)`
test.snapshot({
	valid: [
		'[].concat',
		'new [].concat(array)',
		'[][concat](array)',
		'[].notConcat(array)',
		'[,].concat(array)',
		'({}).concat(array)',
		'[].concat()',
		'[].concat(array, EXTRA_ARGUMENT)',
		'[]?.concat(array)',
		'[].concat?.(array)'
	],
	invalid: [
		'[].concat(array)'
	]
});

// `[].concat(...array)`
test.snapshot({
	valid: [
		'new [].concat(...array)',
		'[][concat](...array)',
		'[].notConcat(...array)',
		'[,].concat(...array)',
		'({}).concat(...array)',
		'[].concat()',
		'[].concat(...array, EXTRA_ARGUMENT)',
		'[]?.concat(...array)',
		'[].concat?.(...array)'
	],
	invalid: [
		'[].concat(...array)'
	]
});

// `[].concat.apply([], array)`
test.snapshot({
	valid: [
		'new [].concat.apply([], array)',
		'[].concat.apply',
		'[].concat.apply([], ...array)',
		'[].concat.apply([], array, EXTRA_ARGUMENT)',
		'[].concat.apply([])',
		'[].concat.apply(NOT_EMPTY_ARRAY, array)',
		'[].concat.apply([,], array)',
		'[,].concat.apply([], array)',
		'[].concat[apply]([], array)',
		'[][concat].apply([], array)',
		'[].concat.notApply([], array)',
		'[].notConcat.apply([], array)',
		'[].concat.apply?.([], array)',
		'[].concat?.apply([], array)',
		'[]?.concat.apply([], array)'
	],
	invalid: [
		'[].concat.apply([], array)'
	]
});

// `Array.prototype.concat.apply([], array)`
test.snapshot({
	valid: [
		'new Array.prototype.concat.apply([], array)',
		'Array.prototype.concat.apply',
		'Array.prototype.concat.apply([], ...array)',
		'Array.prototype.concat.apply([], array, EXTRA_ARGUMENT)',
		'Array.prototype.concat.apply([])',
		'Array.prototype.concat.apply(NOT_EMPTY_ARRAY, array)',
		'Array.prototype.concat.apply([,], array)',
		'Array.prototype.concat[apply]([], array)',
		'Array.prototype[concat].apply([], array)',
		'Array[prototype].concat.apply([], array)',
		'Array.prototype.concat.notApply([], array)',
		'Array.prototype.notConcat.apply([], array)',
		'Array.notPrototype.concat.apply([], array)',
		'NotArray.prototype.concat.apply([], array)',
		'Array.prototype.concat.apply?.([], array)',
		'Array.prototype.concat?.apply([], array)',
		'Array.prototype?.concat.apply([], array)',
		'Array?.prototype.concat.apply([], array)'
	],
	invalid: [
		'Array.prototype.concat.apply([], array)'
	]
});

// `_.flatten(array)`
test.snapshot({
	valid: [
		'new _.flatten(array)',
		'_.flatten',
		'_.flatten(array, EXTRA_ARGUMENT)',
		'_.flatten(...array)',
		'_[flatten](array)',
		'_.notFlatten(array)',
		'NOT_LODASH.flatten(array)',
		'_.flatten?.(array)',
		'_?.flatten(array)'
	],
	invalid: [
		'_.flatten(array)',
		'lodash.flatten(array)',
		'underscore.flatten(array)'
	]
});

test.snapshot({
	valid: [
		'array.flat()',
		'array.flat(1)'
	],
	invalid: [
		// ASI
		outdent`
			before()
			Array.prototype.concat.apply([], [array].concat(array))
		`,
		// Parentheses
		'Array.prototype.concat.apply([], (0, array))',
		'async function a() { return [].concat(await getArray()); }',
		// Comment
		'[].concat(some./**/array)',
		'[/**/].concat(some./**/array)',
		'[/**/].concat(some.array)'
	]

});

