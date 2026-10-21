import test from 'node:test';
import {Linter} from 'eslint';
import isArray, {
	isIndexedCollection,
	isKnownNonArray,
	isKnownNonIndexedCollection,
	isKnownBigIntTypedArray,
} from '../../rules/utils/is-array.js';
import typedArray from '../../rules/shared/typed-array.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

/*
Resolve the receiver of the `.method()` call in `code` and return the array checkers' verdicts for it.
*/
const getReceiverVerdicts = code => {
	let verdicts;

	linter.verify(code, {
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			parser: parsers.typescript.implementation,
			parserOptions: parsers.typescript.mergeParserOptions(),
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							CallExpression(node) {
								if (
									node.callee.type !== 'MemberExpression'
									|| node.callee.computed
									|| node.callee.property.type !== 'Identifier'
									|| node.callee.property.name !== 'method'
								) {
									return;
								}

								const receiver = node.callee.object;
								verdicts ??= {
									isArray: isArray(receiver, context),
									isIndexedCollection: isIndexedCollection(receiver, context),
									isKnownNonArray: isKnownNonArray(receiver, context),
									isKnownNonIndexedCollection: isKnownNonIndexedCollection(receiver, context),
									isKnownBigIntTypedArray: isKnownBigIntTypedArray(receiver, context),
								};
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});

	if (!verdicts) {
		throw new Error(`Expected to find a method call in: ${code}`);
	}

	return verdicts;
};

// The two ways a receiver type can be spelled without type information, which must always agree
const spellings = typeName => [
	`function foo(receiver: ${typeName}) { receiver.method(); }`,
	`const receiver = new ${typeName}(); receiver.method();`,
];

test('unwritten simple rest parameters are arrays without type information', t => {
	for (const code of [
		'function run(...values) { values.method(); }',
		'/** @param {...boolean} values */ function run(...values) { values.method(); }',
		'const run = (...values) => values.method();',
		'class Task { run(first, ...values) { values.push(first); values.method(); } }',
	]) {
		const verdicts = getReceiverVerdicts(code);
		t.assert.strictEqual(verdicts.isArray, true, code);
		t.assert.strictEqual(verdicts.isIndexedCollection, true, code);
		t.assert.strictEqual(verdicts.isKnownNonArray, false, code);
		t.assert.strictEqual(verdicts.isKnownNonIndexedCollection, false, code);
		t.assert.strictEqual(verdicts.isKnownBigIntTypedArray, false, code);
	}
});

test('rest parameter inference excludes writes, object rest, and shadowed ordinary parameters', t => {
	for (const code of [
		'function run(...values) { values = source; values.method(); }',
		'function run(...values) { function change() { values = source; } values.method(); }',
		'function run({...values}) { values.method(); }',
		'function outer(...values) { function inner(values) { values.method(); } }',
	]) {
		const verdicts = getReceiverVerdicts(code);
		t.assert.strictEqual(verdicts.isArray, false, code);
		t.assert.strictEqual(verdicts.isIndexedCollection, false, code);
		t.assert.strictEqual(verdicts.isKnownNonArray, false, code);
		t.assert.strictEqual(verdicts.isKnownNonIndexedCollection, false, code);
	}
});

test('`isKnownNonArray` and `isKnownNonIndexedCollection` treat a typed array as the only disagreement', t => {
	for (const typeName of typedArray) {
		for (const code of spellings(typeName)) {
			const verdicts = getReceiverVerdicts(code);

			t.assert.strictEqual(verdicts.isKnownNonArray, true, `A typed array is not an array: ${code}`);
			t.assert.strictEqual(verdicts.isIndexedCollection, true, code);
			t.assert.strictEqual(verdicts.isKnownNonIndexedCollection, false, `A typed array is an indexed collection: ${code}`);
		}
	}
});

test('typed-array factories remain non-arrays and indexed collections', t => {
	for (const typeName of typedArray) {
		for (const receiver of [`${typeName}.from(input)`, `${typeName}.of(value)`, `${typeName}.of(...input)`]) {
			for (const code of [`${receiver}.method();`, `const receiver = ${receiver}; receiver.method();`]) {
				const verdicts = getReceiverVerdicts(code);

				t.assert.strictEqual(verdicts.isArray, false, code);
				t.assert.strictEqual(verdicts.isIndexedCollection, true, code);
				t.assert.strictEqual(verdicts.isKnownNonArray, true, code);
				t.assert.strictEqual(verdicts.isKnownNonIndexedCollection, false, code);
				t.assert.strictEqual(verdicts.isKnownBigIntTypedArray, typeName.startsWith('Big'), code);
			}
		}
	}
});

test('unknown and optional factory calls remain unknown', t => {
	for (const code of [
		'Uint8Array.create(input).method();',
		'CustomArray.from(input).method();',
		'Uint8Array.from?.(input).method();',
		'Uint8Array?.of(input).method();',
	]) {
		const verdicts = getReceiverVerdicts(code);

		t.assert.strictEqual(verdicts.isArray, false, code);
		t.assert.strictEqual(verdicts.isIndexedCollection, false, code);
		t.assert.strictEqual(verdicts.isKnownNonArray, false, code);
		t.assert.strictEqual(verdicts.isKnownNonIndexedCollection, false, code);
	}
});

test('both checkers agree that a keyed collection is neither', t => {
	for (const typeName of ['Map', 'WeakMap', 'Set', 'WeakSet']) {
		for (const code of spellings(typeName)) {
			const verdicts = getReceiverVerdicts(code);

			t.assert.strictEqual(verdicts.isKnownNonArray, true, `Unexpected verdict for: ${code}`);
			t.assert.strictEqual(verdicts.isIndexedCollection, false, code);
			t.assert.strictEqual(verdicts.isKnownNonIndexedCollection, true, `Unexpected verdict for: ${code}`);
		}
	}

	// The readonly aliases have no constructor, so only the annotation spelling applies
	for (const typeName of ['ReadonlyMap<string, number>', 'ReadonlySet<string>']) {
		const [annotation] = spellings(typeName);
		const verdicts = getReceiverVerdicts(annotation);

		t.assert.strictEqual(verdicts.isKnownNonArray, true, `Unexpected verdict for: ${annotation}`);
		t.assert.strictEqual(verdicts.isKnownNonIndexedCollection, true, `Unexpected verdict for: ${annotation}`);
	}
});

test('both checkers agree that a canvas context is neither', t => {
	for (const typeName of ['CanvasRenderingContext2D', 'OffscreenCanvasRenderingContext2D']) {
		const [annotation] = spellings(typeName);
		const verdicts = getReceiverVerdicts(annotation);

		t.assert.strictEqual(verdicts.isKnownNonArray, true, `Unexpected verdict for: ${annotation}`);
		t.assert.strictEqual(verdicts.isKnownNonIndexedCollection, true, `Unexpected verdict for: ${annotation}`);
	}
});

test('both checkers agree that an array is neither a non-array nor a non-indexed-collection', t => {
	for (const code of [
		'function foo(receiver: string[]) { receiver.method(); }',
		'function foo(receiver: readonly string[]) { receiver.method(); }',
		'function foo(receiver: Array<string>) { receiver.method(); }',
		'function foo(receiver: ReadonlyArray<string>) { receiver.method(); }',
		'function foo(receiver: [string, number]) { receiver.method(); }',
		'const receiver = new Array(); receiver.method();',
		'const receiver = Array(); receiver.method();',
		'const receiver = []; receiver.method();',
		'const receiver = Array.from(foo); receiver.method();',
	]) {
		const verdicts = getReceiverVerdicts(code);

		t.assert.strictEqual(verdicts.isArray, true, `Unexpected verdict for: ${code}`);
		t.assert.strictEqual(verdicts.isIndexedCollection, true, code);
		t.assert.strictEqual(verdicts.isKnownNonArray, false, `Unexpected verdict for: ${code}`);
		t.assert.strictEqual(verdicts.isKnownNonIndexedCollection, false, `Unexpected verdict for: ${code}`);
	}
});

test('both checkers agree that an unknown receiver is not known to be anything', t => {
	for (const code of [
		'receiver.method();',
		'function foo(receiver) { receiver.method(); }',
		'function foo(receiver: unknown) { receiver.method(); }',
		'function foo(receiver: Foo) { receiver.method(); }',
		'import {Foo} from "./foo.js"; function bar(receiver: Foo) { receiver.method(); }',
	]) {
		const verdicts = getReceiverVerdicts(code);

		t.assert.strictEqual(verdicts.isArray, false, `Unexpected verdict for: ${code}`);
		t.assert.strictEqual(verdicts.isIndexedCollection, false, code);
		t.assert.strictEqual(verdicts.isKnownNonArray, false, `Unexpected verdict for: ${code}`);
		t.assert.strictEqual(verdicts.isKnownNonIndexedCollection, false, `Unexpected verdict for: ${code}`);
	}
});

test('array checkers resolve explicit local function return annotations', t => {
	for (const code of [
		'declare function getValues(): object[]; getValues().method();',
		'declare function getValues(): object[]; const values = getValues(); values.method();',
		'declare function getValues(): [object, object]; getValues().method();',
		'interface Values extends Array<object> {} declare function getValues(): Values; getValues().method();',
	]) {
		const verdicts = getReceiverVerdicts(code);

		t.assert.strictEqual(verdicts.isArray, true, `Unexpected verdict for: ${code}`);
		t.assert.strictEqual(verdicts.isKnownNonArray, false, `Unexpected verdict for: ${code}`);
		t.assert.strictEqual(verdicts.isKnownNonIndexedCollection, false, `Unexpected verdict for: ${code}`);
	}

	for (const code of [
		'interface Collection {} declare function getValues(): Collection; getValues().method();',
		'declare function getValues(): Set<object>; getValues().method();',
	]) {
		const verdicts = getReceiverVerdicts(code);

		t.assert.strictEqual(verdicts.isArray, false, `Unexpected verdict for: ${code}`);
		t.assert.strictEqual(verdicts.isKnownNonArray, true, `Unexpected verdict for: ${code}`);
		t.assert.strictEqual(verdicts.isKnownNonIndexedCollection, true, `Unexpected verdict for: ${code}`);
	}

	const typedArray = getReceiverVerdicts('declare function getValues(): Uint8Array; getValues().method();');
	t.assert.strictEqual(typedArray.isArray, false);
	t.assert.strictEqual(typedArray.isKnownNonArray, true);
	t.assert.strictEqual(typedArray.isKnownNonIndexedCollection, false);
});

test('array checkers use JSDoc parameter and return annotations', t => {
	for (const code of [
		'/** @param {string[]} receiver */ function run(receiver) { receiver.method(); }',
		'/** @param {Array<string>} receiver */ function run(receiver) { receiver.method(); }',
		'/** @param {Array.<string>} receiver */ function run(receiver) { receiver.method(); }',
		'/** @param {ReadonlyArray<string>} receiver */ function run(receiver) { receiver.method(); }',
		'/** @param {readonly string[]} receiver */ function run(receiver) { receiver.method(); }',
		'/** @param {[string, number]} receiver */ function run(receiver) { receiver.method(); }',
		'/** @returns {string[]} */ function create() { return source; } create().method();',
	]) {
		const verdicts = getReceiverVerdicts(code);
		t.assert.strictEqual(verdicts.isArray, true, code);
		t.assert.strictEqual(verdicts.isIndexedCollection, true, code);
		t.assert.strictEqual(verdicts.isKnownNonArray, false, code);
	}

	const typedArray = getReceiverVerdicts('/** @param {Uint8Array} receiver */ function run(receiver) { receiver.method(); }');
	t.assert.strictEqual(typedArray.isArray, false);
	t.assert.strictEqual(typedArray.isIndexedCollection, true);
	t.assert.strictEqual(typedArray.isKnownNonArray, true);
	const optional = getReceiverVerdicts('/** @param {Array<string>} [receiver] */ function run(receiver) { receiver.method(); }');
	t.assert.strictEqual(optional.isArray, false);
	t.assert.strictEqual(optional.isKnownNonArray, false);
});

test('array checkers leave unsupported local function returns unknown', t => {
	for (const code of [
		'function getValues() { return []; } getValues().method();',
		'interface Collection {} function getValues<T extends Collection>(): T { return value; } getValues().method();',
		'interface Collection {} const getValues: () => Collection = () => value; getValues().method();',
		'interface Collection {} declare const getValues: () => Collection; getValues().method();',
		'interface Collection {} const getValues = (((): Collection => value) as unknown as (() => object[])); getValues().method();',
		'import {getValues} from "collection"; getValues().method();',
		'import type {Collection} from "collection"; declare function getValues(): Collection; getValues().method();',
		'interface Collection {} declare function getValues(): Collection; declare function getValues(): object[]; getValues().method();',
	]) {
		const verdicts = getReceiverVerdicts(code);

		t.assert.strictEqual(verdicts.isArray, false, `Unexpected verdict for: ${code}`);
		t.assert.strictEqual(verdicts.isKnownNonArray, false, `Unexpected verdict for: ${code}`);
		t.assert.strictEqual(verdicts.isKnownNonIndexedCollection, false, `Unexpected verdict for: ${code}`);
	}
});

test('a union is only known when every member is', t => {
	const indexed = getReceiverVerdicts('function foo(receiver: number[] | Uint8Array) { receiver.method(); }');

	t.assert.strictEqual(indexed.isIndexedCollection, true);

	// Every member is a non-array, but only one is an indexed collection
	const mixed = getReceiverVerdicts('function foo(receiver: Uint8Array | Set<number>) { receiver.method(); }');
	t.assert.strictEqual(mixed.isKnownNonArray, true);
	t.assert.strictEqual(mixed.isIndexedCollection, false);
	t.assert.strictEqual(mixed.isKnownNonIndexedCollection, false);

	// An array member makes it neither
	const withArray = getReceiverVerdicts('function foo(receiver: string[] | Set<string>) { receiver.method(); }');
	t.assert.strictEqual(withArray.isKnownNonArray, false);
	t.assert.strictEqual(withArray.isKnownNonIndexedCollection, false);

	// No member is either
	const neither = getReceiverVerdicts('function foo(receiver: Set<string> | Map<string, string>) { receiver.method(); }');
	t.assert.strictEqual(neither.isKnownNonArray, true);
	t.assert.strictEqual(neither.isKnownNonIndexedCollection, true);
});

test('intersections with unknown members do not establish an array type', t => {
	for (const code of [
		'function foo(receiver: string[] & any) { receiver.method(); }',
		'type Unchecked = any; function foo(receiver: string[] & Unchecked) { receiver.method(); }',
		'function foo(receiver: string[] & Unresolved) { receiver.method(); }',
	]) {
		const verdicts = getReceiverVerdicts(code);

		t.assert.strictEqual(verdicts.isArray, false, `Unexpected verdict for: ${code}`);
		t.assert.strictEqual(verdicts.isKnownNonArray, false, `Unexpected verdict for: ${code}`);
		t.assert.strictEqual(verdicts.isKnownNonIndexedCollection, false, `Unexpected verdict for: ${code}`);
	}
});

test('intersections with known structural brands preserve array types', t => {
	const verdicts = getReceiverVerdicts('function foo(receiver: string[] & {brand: true}) { receiver.method(); }');

	t.assert.strictEqual(verdicts.isArray, true);
	t.assert.strictEqual(verdicts.isKnownNonArray, false);
	t.assert.strictEqual(verdicts.isKnownNonIndexedCollection, false);
});

for (const expression of ['toReversed()', 'toSorted()', 'toSpliced(0, 1)', 'with(0, "replacement")']) {
	test(`array copying result ${expression} preserves array inference`, t => {
		for (const code of [
			`/** @param {string[]} values */ function run(values) { values.${expression}.method(); }`,
			`/** @param {ReadonlyArray<string>} values */ function run(values) { values.${expression}.method(); }`,
			`/** @param {[string, number]} values */ function run(values) { values.${expression}.method(); }`,
			`/** @returns {string[]} */ function read() { return source; } read().${expression}.method();`,
			`function run(values: readonly string[]) { values.${expression}.method(); }`,
			`function run(...values) { values.${expression}.method(); }`,
			`const values = ["value"]; const copy = values.${expression}; copy.method();`,
			`Array.from(source).${expression}.method();`,
			`Array.of("value").${expression}.toReversed().method();`,
			`const values = condition ? ["one"] : ["two"]; values.${expression}.method();`,
		]) {
			t.assert.deepStrictEqual(getReceiverVerdicts(code), {
				isArray: true,
				isIndexedCollection: true,
				isKnownNonArray: false,
				isKnownNonIndexedCollection: false,
				isKnownBigIntTypedArray: false,
			}, code);
		}
	});
}

test('array copying inference preserves unknown receiver and call boundaries', t => {
	for (const code of [
		'function run(values) { values.toSorted().method(); }',
		'/** @param {unknown} values */ function run(values) { values.toReversed().method(); }',
		'/** @param {?string[]} values */ function run(values) { values.toReversed().method(); }',
		'/** @param {string[]} [values] */ function run(values) { values.toReversed().method(); }',
		'/** @param {string[] | Uint8Array} values */ function run(values) { values.toSorted().method(); }',
		'/** @param {string[]} values */ function run(values: unknown) { values.toSorted().method(); }',
		'/** @param {{toSorted: () => string}} values */ function run(values) { values.toSorted().method(); }',
		'const values = ["value"]; values?.toReversed().method();',
		'const values = ["value"]; values.toReversed?.().method();',
		'const values = ["value"]; values[method]().method();',
		'const values = ["value"]; values.map(callback).method();',
		'const values = ["value"]; values.filter(callback).method();',
		'const values = ["value"]; values.slice().method();',
		'const values = values.toReversed(); values.method();',
		'const first = second.toSorted(); const second = first.toReversed(); first.method();',
	]) {
		t.assert.deepStrictEqual(getReceiverVerdicts(code), {
			isArray: false,
			isIndexedCollection: false,
			isKnownNonArray: false,
			isKnownNonIndexedCollection: false,
			isKnownBigIntTypedArray: false,
		}, code);
	}
});

test('typed array copying chains remain unsupported without type information', t => {
	for (const typeName of typedArray) {
		for (const expression of ['toReversed()', 'toSorted()', 'with(0, value)']) {
			const code = `/** @param {${typeName}} values */ function run(values) { values.${expression}.method(); }`;
			t.assert.deepStrictEqual(getReceiverVerdicts(code), {
				isArray: false,
				isIndexedCollection: false,
				isKnownNonArray: false,
				isKnownNonIndexedCollection: false,
				isKnownBigIntTypedArray: false,
			}, code);
		}
	}
});

test('array copying methods create arrays without consulting constructor species', t => {
	const values = ['two', 'one'];
	Object.defineProperty(values, 'constructor', {
		get() {
			throw new Error('Copying must not read the constructor');
		},
	});

	for (const copy of [values.toReversed(), values.toSorted((first, second) => first.localeCompare(second)), values.toSpliced(0, 1), values.with(0, 'replacement')]) {
		t.assert.strictEqual(Array.isArray(copy), true);
		t.assert.notStrictEqual(copy, values);
	}

	t.assert.strictEqual(values.join(','), 'two,one');
});

for (const expression of ['copyWithin(0, 1)', 'fill(1)', 'reverse()', 'sort(compare)']) {
	test(`array mutation result ${expression} preserves array inference`, t => {
		for (const code of [
			`/** @param {number[]} values */ function run(values) { values.${expression}.method(); }`,
			`/** @param values {[number, number]} */ function run(values) { values.${expression}.method(); }`,
			`/** @returns {number[]} */ function read() { return source; } read().${expression}.method();`,
			`function run(values: number[]) { values.${expression}.method(); }`,
			`function run(...values) { values.${expression}.method(); }`,
			`const values = Array.from(source); const result = values.${expression}.toReversed(); result.method();`,
		]) {
			t.assert.deepStrictEqual(getReceiverVerdicts(code), {
				isArray: true,
				isIndexedCollection: true,
				isKnownNonArray: false,
				isKnownNonIndexedCollection: false,
				isKnownBigIntTypedArray: false,
			}, code);
		}
	});
}

test('array mutation inference preserves unknown receivers and existing call boundaries', t => {
	for (const code of [
		'function run(values) { values.reverse().method(); }',
		'/** @param {unknown} values */ function run(values) { values.fill(1).method(); }',
		'/** @param {?number[]} values */ function run(values) { values.sort(compare).method(); }',
		'/** @param {number[]} [values] */ function run(values) { values.copyWithin(0, 1).method(); }',
		'/** @param {number[] | Uint8Array} values */ function run(values) { values.reverse().method(); }',
		'/** @param {{reverse: () => string}} values */ function run(values) { values.reverse().method(); }',
		'/** @param {number[]} values */ function run(values: unknown) { values.reverse().method(); }',
		'/** @param {number[]} values */ function run(values) { values?.reverse().method(); }',
		'/** @param {number[]} values */ function run(values) { values.sort?.(compare).method(); }',
		'/** @param {number[]} values */ function run(values) { values["reverse"]().method(); }',
		'/** @param {number[]} values */ function run(values) { values.pop().method(); }',
		'/** @param {number[]} values */ function run(values) { values.push(1).method(); }',
		'/** @param {number[]} values */ function run(values) { values.splice(0, 1).method(); }',
		'const values = values.sort(compare); values.method();',
		'const first = second.reverse(); const second = first.fill(1); first.method();',
	]) {
		t.assert.deepStrictEqual(getReceiverVerdicts(code), {
			isArray: false,
			isIndexedCollection: false,
			isKnownNonArray: false,
			isKnownNonIndexedCollection: false,
			isKnownBigIntTypedArray: false,
		}, code);
	}
});

test('typed array mutation chains remain unsupported without type information', t => {
	for (const type of ['Uint8Array', 'Float16Array', 'BigInt64Array', 'BigUint64Array']) {
		for (const expression of ['copyWithin(0, 1)', 'fill(value)', 'reverse()', 'sort(compare)']) {
			const code = `/** @param {${type}} values */ function run(values) { values.${expression}.method(); }`;
			t.assert.deepStrictEqual(getReceiverVerdicts(code), {
				isArray: false,
				isIndexedCollection: false,
				isKnownNonArray: false,
				isKnownNonIndexedCollection: false,
				isKnownBigIntTypedArray: false,
			}, code);
		}
	}
});

test('array mutation methods return the original array without reading its constructor', t => {
	for (const [method, methodArguments, expected] of [
		['copyWithin', [1, 0, 1], [3, 3, 2]],
		['fill', [9, 1], [3, 9, 9]],
		['reverse', [], [2, 1, 3]],
		['sort', [(first, second) => first - second], [1, 2, 3]],
	]) {
		const values = [3, 1, 2];
		Object.defineProperty(values, 'constructor', {
			get() {
				throw new Error('Mutation must not read the constructor');
			},
		});
		t.assert.strictEqual(Reflect.apply(Array.prototype[method], values, methodArguments), values);
		t.assert.deepStrictEqual([...values], expected);
	}
});
