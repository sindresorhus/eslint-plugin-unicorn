import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'foo.slice?.(1, foo.length)',
		'foo.slice(foo.length, 1)',
		'foo.slice()',
		'foo.slice(1)',
		'foo.slice(1, foo.length - 1)',
		'foo.slice(1, foo.length, extraArgument)',
		'foo.slice(...[1], foo.length)',
		'foo.notSlice(1, foo.length)',
		'new foo.slice(1, foo.length)',
		'slice(1, foo.length)',
		'foo.slice(1, foo.notLength)',
		'foo.slice(1, length)',
		'foo[slice](1, foo.length)',
		'foo.slice(1, foo[length])',
		'foo.slice(1, bar.length)',
		'foo?.slice(1, NotInfinity)',
		'foo?.slice(1, Number.NOT_POSITIVE_INFINITY)',
		'foo?.slice(1, Not_Number.POSITIVE_INFINITY)',
		'foo?.slice(1, Number?.POSITIVE_INFINITY)',
		// `isSameReference` consider they are not the same reference
		'foo().slice(1, foo().length)',
	],
	invalid: [
		'foo.slice(1, foo.length)',
		'foo?.slice(1, foo.length)',
		'foo.slice(1, foo.length,)',
		'foo.slice(1, (( foo.length )))',
		'foo.slice(1, foo?.length)',
		'foo?.slice(1, foo?.length)',
		'foo?.slice(1, Infinity)',
		'foo?.slice(1, Number.POSITIVE_INFINITY)',
	],
});
