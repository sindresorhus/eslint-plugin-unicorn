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
		'[...map.values()].find(value => value)',
		'[...map.keys()].some(value => value)',
		'[...map.entries()].every(value => value)',
		'[...set.values()].forEach(value => value)',
		'[...string.matchAll(pattern)].reduce(value => value)',
		'[...string.matchAll(pattern)].reduce(value => value, initialValue)',

		// Array.from form.
		'Array.from(map.values()).find(value => value)',
		'Array.from(map.keys()).some(value => value)',
		'Array.from(map.entries()).every(value => value)',
		'Array.from(set.values()).forEach(value => value)',
		'Array.from(string.matchAll(pattern)).reduce(value => value)',
		'Array.from(string.matchAll(pattern)).reduce(value => value, initialValue)',

		// Static Iterator methods and lazy helper chains.
		'[...Iterator.from(iterable)].find(value => value)',
		'[...globalThis.Iterator.from(iterable)].find(value => value)',
		'[...(globalThis).Iterator.zip(first, second)].some(value => value)',
		'[...Iterator.concat(first, second)].some(value => value)',
		'[...Iterator.zip(first, second)].every(value => value)',
		'[...Iterator.zipKeyed({first, second})].forEach(value => value)',
		'[...map.values().map(value => value)].find(value => value)',
		'Array.from(map.values().filter(value => value)).some(value => value)',
		'Array.from(map.values().flatMap(value => value)).every(value => value)',
		'Array.from(map.values().drop(count)).forEach(value => value)',
		'Array.from(map.values().take(count)).reduce(value => value)',
		'Array.from(map.values().take(count)).reduce(value => value, initialValue)',
		'const iterator = items.values(); [...iterator].find(value => value);',
		'function * generate() { yield 1; } Array.from(generate()).some(value => value);',

		// Callback boundary arguments are still safe.
		'[...map.values()].find((value, index) => value === index)',
		'[...map.values()].some((value, index) => value === index)',
		'[...map.values()].every((value, index) => value === index)',
		'[...map.values()].forEach((value, index) => fn(value, index))',
		'[...map.values()].reduce((accumulator, value, index) => accumulator + value + index)',

		// Parenthesized and multiline.
		'[...(map.values())].find(value => value)',
		outdent`
			Array.from(
				map
					.values()
					.map(value => value * 2),
			).find(value => value > 0);
		`,

		// Comments inside the iterator expression are preserved.
		'[...map.values(/* comment */).map(value => value)].find(value => value)',
		'Array.from(map.values(/* comment */)).find(value => value)',

		// Comments outside the iterator expression are reported without a suggestion.
		'[/* comment */ ...map.values()].find(value => value)',
		'[...map.values() /* comment */].find(value => value)',
		'Array.from(/* comment */ map.values()).find(value => value)',

		// Optional iterator chains preserve the materialization's throwing behavior.
		'[...map?.values()].find(value => value)',
		'[...map.values?.()].find(value => value)',
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'Array.from({values() { return [1].values(); }}.values()).find(value => true)',
			errors: [{
				messageId: 'prefer-iterator-helpers',
				suggestions: [{
					messageId: 'prefer-iterator-helpers/suggestion',
					output: '({values() { return [1].values(); }}.values()).find(value => true)',
				}],
			}],
		},
		{
			code: '[...object?.map.values()].find(value => true)',
			errors: [{
				messageId: 'prefer-iterator-helpers',
				suggestions: [{
					messageId: 'prefer-iterator-helpers/suggestion',
					output: '(object?.map.values()).find(value => true)',
				}],
			}],
		},
		{
			code: 'function foo() { return[...map.values()].find(value => value); }',
			errors: [{
				messageId: 'prefer-iterator-helpers',
				suggestions: [{
					messageId: 'prefer-iterator-helpers/suggestion',
					output: 'function foo() { return map.values().find(value => value); }',
				}],
			}],
		},
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'[...set].find(value => value) as Value',
		'Array.from<number>(map.values()).find(value => value)',
		'[...map.values()].find(((value, index, array) => array.length > 0) as Predicate)',
		'[...map.values()].reduce((function () { return arguments[3]?.length; }) as Reducer, initialValue)',
		'function foo(array: string[]) { [...array].find(value => value); }',
		'function foo(iterable: Iterable<string>) { [...iterable].find(value => value); }',
		'type Iterator<T> = T[]; function foo(iterator: Iterator<string>) { [...iterator].find(value => value); }',
		'interface Iterator<T> extends Array<T> {} function foo(iterator: Iterator<string>) { [...iterator].find(value => value); }',
		'import type {Iterator} from "iterators"; function foo(iterator: Iterator<string>) { [...iterator].find(value => value); }',
	],
	invalid: [
		'[...map.values()].find(value => value) as Value',
		'[...map!.values()].some(value => value)',
		'Array.from(map.values() satisfies Iterable<Value>).every(value => value)',
		'function foo(iterator: Iterator<string>) { [...iterator].find(value => value); }',
		'function foo(iterator: IterableIterator<string>) { Array.from(iterator).some(value => value); }',
		outdent`
			previous
			Array.from(map.values() satisfies Iterable<Value>).every(value => value);
		`,
	],
});

test.snapshot({
	valid: [
		typeAware('declare function getArray(): string[]; [...getArray()].find(value => value);'),
		typeAware('declare function getIterable(): Iterable<string>; [...getIterable()].find(value => value);'),
		typeAware('type Iterator<T> = T[]; declare function getIterator(): Iterator<string>; [...getIterator()].find(value => value);'),
		typeAware('interface Iterator<T> extends Array<T> {} declare function getIterator(): Iterator<string>; [...getIterator()].find(value => value);'),
	],
	invalid: [
		typeAware('declare function getIterator(): Iterator<string>; [...getIterator()].find(value => value);'),
		typeAware('declare function getIterator(): Iterator<string>; Array.from(getIterator()).some(value => value);'),
		typeAware('declare function getIteratorObject(): IteratorObject<string>; [...getIteratorObject()].reduce(value => value, initialValue);'),
		typeAware('function * getIterator() { yield ""; } [...getIterator()].find(value => value);'),
		typeAware('declare const iterator: IteratorObject<number> | undefined; Array.from(iterator?.map(value => value)!).some(value => value > 0);'),
		typeAware('declare const iterator: IteratorObject<number> | undefined; [...iterator?.map(value => value)!].some(value => value > 0);'),
	],
});

// `Iterator` callbacks take fewer arguments than the array ones, so a named callback is resolved to its declaration to check what it reads
test.snapshot({
	valid: [
		'function callback(value, index, array) { return array.length > 0; } [...map.values()].some(callback);',
		'const callback = (value, index, array) => array.length > 0; [...map.values()].some(callback);',
		'function callback(...values) { return values[2]; } [...map.values()].some(callback);',
		'function callback(value) { return arguments[2]; } [...map.values()].some(callback);',
		'const callback = function (value) { return arguments[2]; }; [...map.values()].some(callback);',
		'function callback(accumulator, value, index, array) { return array.length; } [...map.values()].reduce(callback, 0);',
		// A callback that cannot be resolved here is treated as reading the argument
		'[...map.values()].some(callback);',
		'import callback from "callback"; [...map.values()].some(callback);',
		'function foo(callback) { return [...map.values()].some(callback); }',
		'[...map.values()].some(foo.callback);',
	],
	invalid: [
		'function callback(value, index) { return value === index; } [...map.values()].some(callback);',
		'const callback = value => value; [...map.values()].find(callback);',
		'const callback = function (value) { return value; }; [...map.values()].every(callback);',
		'function callback(accumulator, value, index) { return accumulator + index; } [...map.values()].reduce(callback, 0);',
		{
			code: 'const callback = ((value: number) => value > 0) as Callback; [...map.values()].some(callback);',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
