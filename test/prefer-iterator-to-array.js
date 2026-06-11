import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Unknown iterable values are intentionally ignored.
		'[...iterator]',
		'[...set]',
		'[...foo]',

		// Not a temporary single-spread array.
		'[first, ...map.values()]',
		'[...map.values(), last]',
		'[...foo, ...bar]',

		// Existing rules own these cases.
		'[...iterator.toArray()]',
		'Array.from(map.values())',

		// Optional chaining.
		'[...map?.values()]',
		'[...map.values?.()]',

		// Computed properties.
		'[...map["values"]()]',
		'[...Iterator["from"](iterable)]',

		// Wrong arity.
		'[...map.values(argument)]',
		'[...map.matchAll()]',
		'[...Iterator.from()]',
		'[...map.values().map(fn, thisArgument)]',

		// Iterator helper calls only match when their receiver is known to be an iterator.
		'[...array.map(fn)]',

		// Existing rules own iterable-accepting parent contexts.
		'new Set([...map.values()])',
		'new Uint8Array([...map.values()])',
		'for (const value of [...map.values()]);',
		'function * generator() { yield * [...map.values()]; }',
		'Promise.all([...map.values()])',
		'Array.from([...map.values()])',
		'new Set([...Iterator.from(iterable)])',
		'Array.from([...Iterator.from(iterable).map(fn)], mapper)',
		'Object.fromEntries([...map.entries()])',
		'[...[...Iterator.from(iterable)]]',
		'fn(...[...Iterator.from(iterable)])',
		'new Foo(...[...Iterator.from(iterable)])',
	],
	invalid: [
		'[...map.values()]',
		'[...map.keys()]',
		'[...map.entries()]',
		'[...string.matchAll(pattern)]',
		'[...Iterator.from(iterable)]',
		'[...Iterator.concat(first, second)]',
		'[...Iterator.concat()]',
		'[...Iterator.from(iterable).map(fn)]',
		'[...Iterator.concat(first, second).filter(fn)]',
		'const object = {...[...Iterator.from(iterable)]}',
		'[...map.values().map(fn)]',
		'[...map.values().filter(fn)]',
		'[...map.values().flatMap(fn)]',
		'[...map.values().drop(count)]',
		'[...map.values().take(count)]',

		// Parenthesized.
		'[...(map.values())]',
		'[...((map.values()))]',
		'[...(condition ? map : set).values()]',

		// Multiline.
		outdent`
			const values = [
				...map
					.values()
					.map(value => value * 2),
			];
		`,

		// Comments inside the iterator expression are preserved.
		'[...map.values(/* comment */).map(fn)]',

		// Comments outside the iterator expression are reported without a fix.
		'[/* comment */ ...map.values()]',
		'[...map.values() /* comment */]',
		'[/* comment */ ...Iterator.from(iterable)]',
	],
});
