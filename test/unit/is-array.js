import {Linter} from 'eslint';
import test from 'ava';
import {isKnownNonArray, isKnownNonIndexedCollection} from '../../rules/utils/is-array.js';
import typedArray from '../../rules/shared/typed-array.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

/*
Resolve the receiver of the only method call in `code` and return both checkers' verdicts for it.
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
								if (node.callee.type !== 'MemberExpression') {
									return;
								}

								const receiver = node.callee.object;
								verdicts ??= {
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

			t.true(verdicts.isKnownNonArray, `A typed array is not an array: ${code}`);
			t.false(verdicts.isKnownNonIndexedCollection, `A typed array is an indexed collection: ${code}`);
		}
	}
});

test('both checkers agree that a keyed collection is neither', t => {
	for (const typeName of ['Map', 'WeakMap', 'Set', 'WeakSet']) {
		for (const code of spellings(typeName)) {
			const verdicts = getReceiverVerdicts(code);

			t.true(verdicts.isKnownNonArray, `Unexpected verdict for: ${code}`);
			t.true(verdicts.isKnownNonIndexedCollection, `Unexpected verdict for: ${code}`);
		}
	}

	// The readonly aliases have no constructor, so only the annotation spelling applies
	for (const typeName of ['ReadonlyMap<string, number>', 'ReadonlySet<string>']) {
		const [annotation] = spellings(typeName);
		const verdicts = getReceiverVerdicts(annotation);

		t.true(verdicts.isKnownNonArray, `Unexpected verdict for: ${annotation}`);
		t.true(verdicts.isKnownNonIndexedCollection, `Unexpected verdict for: ${annotation}`);
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

		t.false(verdicts.isKnownNonArray, `Unexpected verdict for: ${code}`);
		t.false(verdicts.isKnownNonIndexedCollection, `Unexpected verdict for: ${code}`);
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

		t.false(verdicts.isKnownNonArray, `Unexpected verdict for: ${code}`);
		t.false(verdicts.isKnownNonIndexedCollection, `Unexpected verdict for: ${code}`);
	}
});

test('a union is only known when every member is', t => {
	// A typed array member makes the union an indexed collection but still not an array
	const mixed = getReceiverVerdicts('function foo(receiver: Uint8Array | Set<number>) { receiver.method(); }');
	t.true(mixed.isKnownNonArray);
	t.false(mixed.isKnownNonIndexedCollection);

	// An array member makes it neither
	const withArray = getReceiverVerdicts('function foo(receiver: string[] | Set<string>) { receiver.method(); }');
	t.false(withArray.isKnownNonArray);
	t.false(withArray.isKnownNonIndexedCollection);

	// No member is either
	const neither = getReceiverVerdicts('function foo(receiver: Set<string> | Map<string, string>) { receiver.method(); }');
	t.true(neither.isKnownNonArray);
	t.true(neither.isKnownNonIndexedCollection);
});
