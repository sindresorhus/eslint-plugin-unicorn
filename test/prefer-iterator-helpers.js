import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);
const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		// Unknown iterable values are intentionally ignored.
		'[...iterator].find(fn)',
		'[...set].some(fn)',
		'[...array].every(fn)',
		'Array.from(set).some(fn)',
		'Array.from(document.querySelectorAll("*")).forEach(fn)',
		'[...document.querySelectorAll("*")].forEach(fn)',
		'[..."unicorn"].find(fn)',

		// Not a temporary single-spread array.
		'[first, ...map.values()].find(fn)',
		'[...map.values(), last].find(fn)',
		'[...foo, ...bar].find(fn)',

		// Existing rules own these cases.
		'iterator.toArray().find(fn)',
		'[...map.values()]',
		'Array.from(map.values())',

		// Methods with different semantics or no Iterator equivalent.
		'[...map.values()].map(fn)',
		'[...map.values()].filter(fn)',
		'[...map.values()].flatMap(fn)',
		'[...map.values()].join(",")',
		'[...map.values()].at(0)',
		'[...map.values()].includes(value)',
		'Array.from(map.values()).includes(value)',

		// Optional chaining.
		'[...map.values()]?.find(fn)',
		'[...map.values()].find?.(fn)',
		'[...map?.values()].find(fn)',
		'[...map.values?.()].find(fn)',
		'Array.from?.(map.values()).find(fn)',
		'Array?.from(map.values()).find(fn)',

		// Computed properties.
		'[...map["values"]()].find(fn)',
		'[...map.values()]["find"](fn)',
		'Array["from"](map.values()).find(fn)',

		// Wrong arity.
		'[...map.values()].find()',
		'[...map.values()].find(fn, thisArgument)',
		'[...map.values()].some(fn, thisArgument)',
		'[...map.values()].every(fn, thisArgument)',
		'[...map.values()].forEach(fn, thisArgument)',
		'[...map.values()].reduce()',
		'[...map.values()].reduce(fn, initialValue, extra)',
		'[...map.values()].includes(value, fromIndex)',
		'Array.from(map.values(), mapFunction).find(fn)',
		'Array.from(map.values(), mapFunction, thisArgument).find(fn)',

		// Spread arguments.
		'[...map.values()].find(...argumentsArray)',
		'[...map.values()].reduce(...argumentsArray)',

		// Array callbacks can expose the `array` argument, Iterator callbacks cannot.
		'[...map.values()].find((value, index, array) => array.length > 0)',
		'[...map.values()].some((...arguments_) => arguments_[2])',
		'[...map.values()].every((value, index, ...rest) => rest[0])',
		'[...map.values()].forEach((value, index, array) => array.push(value))',
		'[...map.values()].reduce((accumulator, value, index, array) => array.length)',
		'[...map.values()].reduce((accumulator, value, index, array) => array.length, initialValue)',
		'[...map.values()].reduce((...arguments_) => arguments_[3], initialValue)',
		'[...map.values()].find(function () { return arguments[2]?.length > 0; })',
		'[...map.values()].reduce(function () { return arguments[3]?.length; }, initialValue)',

		// Non-matching static methods.
		'TypedArray.from(map.values()).find(fn)',
		'Int8Array.from(map.values()).find(fn)',
		'NotArray.from(map.values()).find(fn)',

		// Shadowed Iterator globals.
		'const Iterator = {from: iterable => iterable}; [...Iterator.from(iterable)].find(fn)',
		'const globalThis = {Iterator: {from: iterable => iterable}}; [...globalThis.Iterator.from(iterable)].find(fn)',
	],
	invalid: [
		// Spread form.
		'[...map.values()].find(fn)',
		'[...map.keys()].some(fn)',
		'[...map.entries()].every(fn)',
		'[...set.values()].forEach(fn)',
		'[...string.matchAll(pattern)].reduce(fn)',
		'[...string.matchAll(pattern)].reduce(fn, initialValue)',

		// Array.from form.
		'Array.from(map.values()).find(fn)',
		'Array.from(map.keys()).some(fn)',
		'Array.from(map.entries()).every(fn)',
		'Array.from(set.values()).forEach(fn)',
		'Array.from(string.matchAll(pattern)).reduce(fn)',
		'Array.from(string.matchAll(pattern)).reduce(fn, initialValue)',

		// Static Iterator methods and lazy helper chains.
		'[...Iterator.from(iterable)].find(fn)',
		'[...globalThis.Iterator.from(iterable)].find(fn)',
		'[...(globalThis).Iterator.zip(first, second)].some(fn)',
		'[...Iterator.concat(first, second)].some(fn)',
		'[...Iterator.zip(first, second)].every(fn)',
		'[...Iterator.zipKeyed({first, second})].forEach(fn)',
		'[...map.values().map(fn)].find(fn)',
		'Array.from(map.values().filter(fn)).some(fn)',
		'Array.from(map.values().flatMap(fn)).every(fn)',
		'Array.from(map.values().drop(count)).forEach(fn)',
		'Array.from(map.values().take(count)).reduce(fn)',
		'Array.from(map.values().take(count)).reduce(fn, initialValue)',

		// Callback boundary arguments are still safe.
		'[...map.values()].find((value, index) => value === index)',
		'[...map.values()].some((value, index) => value === index)',
		'[...map.values()].every((value, index) => value === index)',
		'[...map.values()].forEach((value, index) => fn(value, index))',
		'[...map.values()].reduce((accumulator, value, index) => accumulator + value + index)',

		// Parenthesized and multiline.
		'[...(map.values())].find(fn)',
		outdent`
			Array.from(
				map
					.values()
					.map(value => value * 2),
			).find(value => value > 0);
		`,

		// Comments inside the iterator expression are preserved.
		'[...map.values(/* comment */).map(fn)].find(fn)',
		'Array.from(map.values(/* comment */)).find(fn)',

		// Comments outside the iterator expression are reported without a suggestion.
		'[/* comment */ ...map.values()].find(fn)',
		'[...map.values() /* comment */].find(fn)',
		'Array.from(/* comment */ map.values()).find(fn)',
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'[...set].find(fn) as Value',
		'[...map.values()].find(((value, index, array) => array.length > 0) as Predicate)',
		'[...map.values()].reduce((function () { return arguments[3]?.length; }) as Reducer, initialValue)',
		'function foo(array: string[]) { [...array].find(fn); }',
		'function foo(iterable: Iterable<string>) { [...iterable].find(fn); }',
		'type Iterator<T> = T[]; function foo(iterator: Iterator<string>) { [...iterator].find(fn); }',
		'interface Iterator<T> extends Array<T> {} function foo(iterator: Iterator<string>) { [...iterator].find(fn); }',
		'import type {Iterator} from "iterators"; function foo(iterator: Iterator<string>) { [...iterator].find(fn); }',
	],
	invalid: [
		'[...map.values()].find(fn) as Value',
		'[...map!.values()].some(fn)',
		'Array.from(map.values() satisfies Iterable<Value>).every(fn)',
		'function foo(iterator: Iterator<string>) { [...iterator].find(fn); }',
		'function foo(iterator: IterableIterator<string>) { Array.from(iterator).some(fn); }',
		outdent`
			previous
			Array.from(map.values() satisfies Iterable<Value>).every(fn);
		`,
	],
});

test.snapshot({
	valid: [
		typeAware('declare function getArray(): string[]; [...getArray()].find(fn);'),
		typeAware('declare function getIterable(): Iterable<string>; [...getIterable()].find(fn);'),
		typeAware('type Iterator<T> = T[]; declare function getIterator(): Iterator<string>; [...getIterator()].find(fn);'),
		typeAware('interface Iterator<T> extends Array<T> {} declare function getIterator(): Iterator<string>; [...getIterator()].find(fn);'),
	],
	invalid: [
		typeAware('declare function getIterator(): Iterator<string>; [...getIterator()].find(fn);'),
		typeAware('declare function getIterator(): Iterator<string>; Array.from(getIterator()).some(fn);'),
		typeAware('declare function getIteratorObject(): IteratorObject<string>; [...getIteratorObject()].reduce(fn, initialValue);'),
		typeAware('function * getIterator() { yield ""; } [...getIterator()].find(fn);'),
	],
});
