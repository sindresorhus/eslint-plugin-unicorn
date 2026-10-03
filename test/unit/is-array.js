import test from 'node:test';
import {Linter} from 'eslint';
import isArray, {isKnownNonArray, isKnownNonIndexedCollection} from '../../rules/utils/is-array.js';
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
									isKnownNonArray: isKnownNonArray(receiver, context),
									isKnownNonIndexedCollection: isKnownNonIndexedCollection(receiver, context),
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

test('`isKnownNonArray` and `isKnownNonIndexedCollection` treat a typed array as the only disagreement', t => {
	for (const typeName of typedArray) {
		for (const code of spellings(typeName)) {
			const verdicts = getReceiverVerdicts(code);

			t.assert.strictEqual(verdicts.isKnownNonArray, true, `A typed array is not an array: ${code}`);
			t.assert.strictEqual(verdicts.isKnownNonIndexedCollection, false, `A typed array is an indexed collection: ${code}`);
		}
	}
});

test('both checkers agree that a keyed collection is neither', t => {
	for (const typeName of ['Map', 'WeakMap', 'Set', 'WeakSet']) {
		for (const code of spellings(typeName)) {
			const verdicts = getReceiverVerdicts(code);

			t.assert.strictEqual(verdicts.isKnownNonArray, true, `Unexpected verdict for: ${code}`);
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
	// A typed array member makes the union an indexed collection but still not an array
	const mixed = getReceiverVerdicts('function foo(receiver: Uint8Array | Set<number>) { receiver.method(); }');
	t.assert.strictEqual(mixed.isKnownNonArray, true);
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
