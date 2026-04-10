import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Already at the end
		'iterator.filter(fn).toArray()',
		'iterator.map(fn).toArray()',

		// No chaining after `.toArray()`
		'iterator.toArray()',
		'const arr = iterator.toArray()',

		// Array-only methods
		'iterator.toArray().slice(1)',
		'iterator.toArray().sort()',
		'iterator.toArray()[0]',
		'iterator.toArray().flat()',
		'iterator.toArray().includes(1)',
		'iterator.toArray().indexOf(1)',
		'iterator.toArray().join(",")',
		'iterator.toArray().at(0)',
		'iterator.toArray().length',

		// Optional chaining
		'iterator?.toArray().filter(fn)',
		'iterator.toArray?.().filter(fn)',
		'iterator.toArray().filter?.(fn)',
		'iterator.toArray()?.filter(fn)',

		// `.toArray()` with arguments
		'iterator.toArray(true).filter(fn)',

		// `thisArg` — Array accepts it, Iterator does not
		'iterator.toArray().filter(fn, thisArg)',

		// `flatMap` — Array callback can return any value, Iterator requires iterable
		'iterator.toArray().flatMap(fn)',
		'iterator.toArray().flatMap(x => x)',
		'iterator.toArray().flatMap(x => x * 2)',

		// Array callbacks receive the 3rd `array` argument, Iterator callbacks do not
		'iterator.toArray().filter((x, index, array) => array.length > 0)',
	],
	invalid: [
		'iterator.toArray().filter(fn)',
		'iterator.toArray().map(fn)',

		// Chained
		'iter.values().toArray().filter(fn)',
		'iter.take(10).toArray().filter(fn)',

		// Multi-step chain
		'iter.toArray().filter(fn).map(fn2)',

		// Parenthesized
		'(iterator.toArray()).filter(fn)',

		// Callback uses `index`
		'iterator.toArray().filter((x, index) => index > 0)',
		'iterator.toArray().filter(function(x, index) { return index > 0; })',
	],
});
