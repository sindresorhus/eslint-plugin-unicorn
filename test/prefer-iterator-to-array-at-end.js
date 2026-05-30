import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Already at the end
		'iterator.filter(x => x > 0).toArray()',
		'iterator.map(x => x * 2).toArray()',

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
		'iterator?.toArray().filter(x => x > 0)',
		'iterator.toArray?.().filter(x => x > 0)',
		'iterator.toArray().filter?.(x => x > 0)',
		'iterator.toArray()?.filter(x => x > 0)',

		// `.toArray()` with arguments
		'iterator.toArray(true).filter(x => x > 0)',

		// `thisArg` — Array accepts it, Iterator does not
		'iterator.toArray().filter(x => x > 0, thisArg)',

		// `flatMap` — Array callback can return any value, Iterator requires iterable
		'iterator.toArray().flatMap(x => x)',
		'iterator.toArray().flatMap(x => x * 2)',

		// Array callbacks receive the 3rd `array` argument, Iterator callbacks do not
		'iterator.toArray().filter((x, index, array) => array.length > 0)',
		'iterator.toArray().filter(function(x, index, array) { return array.length > 0; })',

		// Rest parameters receive Array's extra callback argument
		'iterator.toArray().filter((...values) => values.length > 0)',
	],
	invalid: [
		'iterator.toArray().filter(x => x > 0)',
		'iterator.toArray().map(x => x * 2)',

		// Chained
		'iter.values().toArray().filter(x => x > 0)',
		'iter.take(10).toArray().filter(x => x > 0)',

		// Multi-step chain
		'iter.toArray().filter(x => x > 0).map(x => x * 2)',

		// Parenthesized
		'(iterator.toArray()).filter(x => x > 0)',

		// Callback uses `index`
		'iterator.toArray().filter((x, index) => index > 0)',

		// Unsafe to autofix: callback behavior is not verifiable
		'iterator.toArray().filter(fn)',
		'iterator.toArray().filter(function(x) { return x > 0; })',
	],
});
