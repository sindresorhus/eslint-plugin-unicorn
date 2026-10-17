import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

// Keyword spacing
test({
	valid: [],
	invalid: [
		{
			code: 'function values() { return[...Iterator.from([1])]; }',
			output: 'function values() { return Iterator.from([1]).toArray(); }',
			errors: 1,
		},
		{
			code: 'function values() { return([...Iterator.from([1])]); }',
			output: 'function values() { return (Iterator.from([1]).toArray()); }',
			errors: 1,
		},
		{
			code: 'async function values() { return await[...Iterator.from([1])]; }',
			output: 'async function values() { return await Iterator.from([1]).toArray(); }',
			errors: 1,
		},
		{
			code: 'function values(map) { return[...map.values()]; }',
			errors: [{
				messageId: 'prefer-iterator-to-array',
				suggestions: [{messageId: 'prefer-iterator-to-array/suggestion', output: 'function values(map) { return map.values().toArray(); }'}],
			}],
		},
	],
});

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

// Unwrapping a spread must preserve statement prefixes and constructor grouping.
test({
	valid: [],
	invalid: [
		['[...function () { return [1, 2]; }().values()];', '(function () { return [1, 2]; }().values()).toArray();'],
		['new [...array.values()].constructor(3);', 'new (array.values().toArray()).constructor(3);'],
	].map(([code, output]) => ({code, errors: [{messageId: 'prefer-iterator-to-array', suggestions: [{messageId: 'prefer-iterator-to-array/suggestion', output}]}]})),
});

test({
	valid: [],
	invalid: [
		{
			code: 'new [...Iterator.from(array)].constructor(3);',
			output: 'new (Iterator.from(array).toArray()).constructor(3);',
			errors: 1,
		},
		{
			code: 'new [...Iterator.from(array)]!.constructor(3);',
			output: 'new (Iterator.from(array).toArray())!.constructor(3);',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'new ([...Iterator.from(array)]).constructor(3);',
			output: 'new (Iterator.from(array).toArray()).constructor(3);',
			errors: 1,
		},
	],
});

nodeTest('iterator replacements preserve expression grammar and constructors', t => {
	const linter = new Linter();
	const config = {plugins: {unicorn: {rules: {'prefer-iterator-to-array': rule}}}, rules: {'unicorn/prefer-iterator-to-array': 'error'}};
	for (const code of [
		'[...function () { return [1, 2]; }().values()];',
		'const array = [1, 2]; new [...array.values()].constructor(3).length;',
		'const array = [1, 2]; new [...Iterator.from(array)].constructor(3).length;',
	]) {
		const [message] = linter.verify(code, config);
		const {range, text} = message.fix ?? message.suggestions[0].fix;
		const output = code.slice(0, range[0]) + text + code.slice(range[1]);
		t.assert.deepStrictEqual(linter.verify(output, config), []);
		t.assert.strictEqual(JSON.stringify(runInNewContext(output, {Iterator})), JSON.stringify(runInNewContext(code, {Iterator})));
	}
});
