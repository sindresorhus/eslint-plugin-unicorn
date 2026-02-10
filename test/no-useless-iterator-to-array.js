import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Not `.toArray()`
		'new Set(iterator)',
		'for (const x of iterator);',
		'iterator.every(fn)',

		// `.toArray()` with arguments (not Iterator.prototype.toArray)
		'new Set(iterator.toArray(true))',
		'for (const x of iterator.toArray(true));',

		// Optional chaining — constructors
		'new Set(iterator?.toArray())',
		'new Set(iterator.toArray?.())',

		// Optional chaining — for-of
		'for (const x of iterator?.toArray());',
		'for (const x of iterator.toArray?.());',

		// Optional chaining — static methods
		'Promise.all?.(iterator.toArray())',
		'Promise?.all(iterator.toArray())',
		'Array.from?.(iterator.toArray())',
		'Object.fromEntries?.(iterator.toArray())',

		// `.toArray()` result used with Array-only methods
		'iterator.toArray().filter(fn)',
		'iterator.toArray().map(fn)',
		'iterator.toArray().flatMap(fn)',
		'iterator.toArray().slice(1)',
		'iterator.toArray().sort()',
		'iterator.toArray()[0]',
		'iterator.toArray().length',
		'iterator.toArray().at(0)',
		'iterator.toArray().flat()',
		'iterator.toArray().includes(1)',
		'iterator.toArray().indexOf(1)',
		'iterator.toArray().join(",")',

		// `.toArray()` result used standalone
		'const arr = iterator.toArray()',
		'function foo() { return iterator.toArray() }',
		'foo(iterator.toArray())',

		// Not a direct `.toArray()` — computed property
		'new Set(iterator["toArray"]())',

		// Multiple arguments to constructor
		'new Map(iterator.toArray(), extraArg)',

		// Zero or extra arguments to static methods
		'Promise.all()',
		'Promise.all(iterator.toArray(), extraArg)',

		// Namespaced constructor
		'new foo.Set(iterator.toArray())',

		// Yield without delegate (not yield*)
		outdent`
			function * foo() {
				yield iterator.toArray();
			}
		`,

		// Non-matching static method or object
		'NotPromise.all(iterator.toArray())',
		'Promise.notAMethod(iterator.toArray())',

		// Iterator method with optional chaining
		'iterator.toArray()?.every(fn)',
		'iterator.toArray().every?.(fn)',

		// Iterator methods with `thisArg` — Array accepts it, Iterator does not
		'iterator.toArray().every(fn, thisArg)',
		'iterator.toArray().find(fn, thisArg)',
		'iterator.toArray().forEach(fn, thisArg)',
		'iterator.toArray().some(fn, thisArg)',

		// `reduce` without initialValue — Array uses first element, Iterator throws
		'iterator.toArray().reduce(fn)',

		// Extra arguments to static methods
		'Array.from(iterator.toArray(), mapFn)',
		'Object.fromEntries(iterator.toArray(), extra)',
	],
	invalid: [
		// Case 1: Constructors that accept iterables
		'new Set(iterator.toArray())',
		'new Map(iterator.toArray())',
		'new WeakSet(iterator.toArray())',
		'new WeakMap(iterator.toArray())',
		'new Int8Array(iterator.toArray())',
		'new Uint8Array(iterator.toArray())',
		'new Float64Array(iterator.toArray())',

		// Case 2: Static methods that accept iterables
		'Promise.all(iterator.toArray())',
		'Promise.allSettled(iterator.toArray())',
		'Promise.any(iterator.toArray())',
		'Promise.race(iterator.toArray())',
		'Array.from(iterator.toArray())',
		'Object.fromEntries(iterator.toArray())',

		// Case 2b: TypedArray.from
		'Uint8Array.from(iterator.toArray())',

		// Case 3: for-of
		'for (const x of iterator.toArray());',
		'for (const x of foo.bar().toArray());',

		// Case 3b: for-await-of
		'async () => { for await (const x of iterator.toArray()); }',

		// Case 4: yield*
		outdent`
			function * foo() {
				yield * iterator.toArray();
			}
		`,

		// Case 5: Iterator methods
		'iterator.toArray().every(fn)',
		'iterator.toArray().find(fn)',
		'iterator.toArray().forEach(fn)',
		'iterator.toArray().reduce(fn, init)',
		'iterator.toArray().some(fn)',

		// Complex chains
		outdent`
			const result = iterator
				.take(10)
				.toArray()
				.every(x => x > 0);
		`,

		// Parenthesized
		'new Set((iterator.toArray()))',
		'for (const x of (iterator.toArray()));',
	],
});
