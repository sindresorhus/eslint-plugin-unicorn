import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Already at the end.
		'iterator.map(fn).toArray()',
		'iterator.filter(fn).toArray()',
		'iterator.flatMap(fn).toArray()',

		// Not `.toArray()`.
		'iterator.map(fn)',
		'iterator.filter(fn)',
		'array.toSorted().map(fn)',

		// `.toArray()` with arguments.
		'iterator.toArray(true).map(fn)',
		'iterator.toArray(true).filter(fn)',
		'iterator.toArray(true).flatMap(fn)',

		// Optional chaining.
		'iterator?.toArray().map(fn)',
		'iterator.toArray?.().map(fn)',
		'iterator.toArray()?.map(fn)',
		'iterator.toArray().map?.(fn)',

		// Computed properties.
		'iterator["toArray"]().map(fn)',
		'iterator.toArray()["map"](fn)',

		// Extra arguments.
		'iterator.toArray().map(fn, thisArgument)',
		'iterator.toArray().filter(fn, thisArgument)',
		'iterator.toArray().flatMap(fn, thisArgument)',
		'iterator.toArray().map(...arguments_)',

		// Array callbacks receive the 3rd `array` argument, Iterator callbacks do not.
		'iterator.toArray().map((value, index, array) => array.length)',
		'iterator.toArray().filter(function (value, index, array) { return array.length; })',
		'iterator.toArray().flatMap((value, index, array) => array)',
		'iterator.toArray().map((...values) => values.length)',

		// Other methods are handled by other rules or intentionally ignored.
		'iterator.toArray().every(fn)',
		'iterator.toArray().find(fn)',
		'iterator.toArray().forEach(fn)',
		'iterator.toArray().reduce(fn, init)',
		'iterator.toArray().some(fn)',
		'iterator.toArray().slice(1)',
		'iterator.toArray().sort()',
		'iterator.toArray().at(0)',
		'iterator.toArray().length',
	],
	invalid: [
		'iterator.toArray().map(fn)',
		'iterator.toArray().filter(fn)',
		'iterator.toArray().flatMap(fn)',
		'iterator.toArray().filter(function (value) { return value; })',

		// Inline callbacks.
		'iterator.toArray().map(value => value * 2)',
		'iterator.toArray().filter((value, index) => index > 0)',
		'iterator.toArray().flatMap(value => [value])',
		'iterator.toArray().flatMap(value => value)',

		// Parenthesized.
		'(iterator.toArray()).map(fn)',
		'((iterator.toArray())).filter(fn)',
		'((iterator).toArray()).flatMap(fn)',

		// Complex receivers.
		'getIterator().toArray().map(fn)',
		'(condition ? iterator : otherIterator).toArray().filter(fn)',

		// Chained methods are handled one helper at a time.
		'iterator.toArray().map(mapper).filter(predicate)',

		// Comments inside the helper call arguments are preserved.
		'iterator.toArray().map(/* comment */ fn)',

		// Comments inside `.toArray()` are reported without a fix.
		'iterator.toArray(/* comment */).map(fn)',

		// Comments between `.toArray()` and the helper method are reported without a fix.
		'iterator.toArray() /* comment */ .map(value => value)',

		// Comments before helper arguments are preserved.
		'iterator.toArray().map /* comment */ (value => value)',

		// Multiline.
		outdent`
			const result = iterator
				.toArray()
				.map(value => value * 2);
		`,

		// TypeScript.
		{
			code: '(iterator as Iterator<number>).toArray().map(value => value * 2)',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'iterator.toArray().map<string>(value => value)',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'iterator!.toArray().filter(Boolean)',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});
