import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['const first = (await getArray(/* keep */))[0];', 'const [first] = await getArray(/* keep */);'],
		['const property = (/* keep */ await getObject()).property;', 'const {property} = /* keep */ await getObject();'],
		['const second = (await Promise.resolve([1, /* keep */ 2]))[1];', 'const [, second] = await Promise.resolve([1, /* keep */ 2]);'],
		['const property = (await {property: /* keep */ 1}).property;', 'const {property} = await {property: /* keep */ 1};'],
		['const first = (await /* keep */ getArray())[0];', 'const [first] = await /* keep */ getArray();'],
		['const property = (await getObject() /* keep */).property;', 'const {property} = await getObject() /* keep */;'],
		['const first = (// keep\r\n  await getArray())[0];', 'const [first] = // keep\r\n  await getArray();'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test({
	valid: [],
	invalid: [
		{
			code: 'const first = (await (getArray() as /* keep */ number[]))[0];',
			output: 'const [first] = await (getArray() as /* keep */ number[]);',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		...[
			'const property = (await getObject())./* keep */property;',
			'const first = (await getArray())[0 /* keep */];',
			'const first = (await {/* keep */ 0: 1, length: 1})[0];',
		].map(code => ({code, errors: 1})),
		{
			code: 'const first = (await [/* keep */ 1])[0 as /* removed */ const];',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
	],
});

nodeTest('commented await inputs retain their values and are evaluated once', async t => {
	const linter = new Linter();
	for (const [declaration, name, value] of [
		['const first = (await getValue(/* keep */))[0];', 'first', [1, 2]],
		['const property = (/* keep */ await getValue()).property;', 'property', {property: 1}],
	]) {
		const code = `async function run() { ${declaration} events.push(['result', ${name}]); } run();`;
		const {output, fixed, messages} = linter.verifyAndFix(code, {
			plugins: {unicorn: {rules: {'no-await-expression-member': rule}}},
			rules: {'unicorn/no-await-expression-member': 'error'},
		});
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.ok(output.includes('/* keep */'));
		for (const source of [code, output]) {
			const events = [];
			// eslint-disable-next-line no-await-in-loop -- Verify the original and fixed code independently.
			await runInNewContext(source, {
				events,
				async getValue() {
					events.push('input');
					await Promise.resolve();
					events.push('resolve');
					return value;
				},
			});
			t.assert.strictEqual(JSON.stringify(events), '["input","resolve",["result",1]]');
		}
	}
});

test.snapshot({
	valid: [
		'const foo = await promise',
		'const {foo: bar} = await promise',
		'const foo = !await promise',
		'const foo = typeof await promise',
		'const foo = await notPromise.method()',
		'const foo = foo[await promise]',

		// These await expression need parenthesized, but rarely used
		'new (await promiseReturnsAClass)',
		'(await promiseReturnsAFunction)()',
	],
	invalid: [
		'(await promise)[0]',
		'(await promise).property',
		'const foo = (await promise).bar()',
		'const foo = (await promise).bar?.()',
		'const foo = (await promise)?.bar()',

		'const firstElement = (await getArray())[0]',
		'const secondElement = (await getArray())[1]',
		'const thirdElement = (await getArray())[2]',
		'const optionalFirstElement = (await getArray())?.[0]',
		'const {propertyOfFirstElement} = (await getArray())[0]',
		'const [firstElementOfFirstElement] = (await getArray())[0]',
		'let foo, firstElement = (await getArray())[0]',
		'var firstElement = (await getArray())[0], bar',

		'const property = (await getObject()).property',
		'let property = (await getObject()).property',
		'const renamed = (await getObject()).property',
		// Only the member directly off `await` is flagged, not the chained `.bar`
		'(await promise).foo.bar',
		'const property = (await getObject())[property]',
		'const property = (await getObject())?.property',
		'const {propertyOfProperty} = (await getObject()).property',
		'const {propertyOfProperty} = (await getObject()).propertyOfProperty',
		'const [firstElementOfProperty] = (await getObject()).property',
		'const [firstElementOfProperty] = (await getObject()).firstElementOfProperty',

		'firstElement = (await getArray())[0]',
		'property = (await getArray()).property',
	],
});

test.typescript({
	valid: [
		'function foo () {return (await promise) as string;}',
		// Non-null assertion (not a member access) on the await result
		'(await promise)!.property',
	],
	invalid: [
		{
			code: 'const foo: Type = (await promise)[0]',
			errors: 1,
		},
		{
			code: 'const foo: Type | A = (await promise).foo',
			errors: 1,
		},
		// The TypeScript wrapper has no runtime effect, the object literal is still not iterable
		{
			code: 'async function f() { const foo = (await ({0: 1, length: 1} as any))[0]; }',
			errors: 1,
		},
		{
			code: 'async function f() { const foo = (await bar)[1 as const]; }',
			output: 'async function f() { const [, foo] = await bar; }',
			errors: 1,
		},
	],
});

test({
	valid: [],
	invalid: [
		// `[-0]` and `[+0]` are the same index as `[0]`
		...[
			['const foo = (await bar)[-0];', 'const [foo] = await bar;'],
			['const foo = (await bar)[+0];', 'const [foo] = await bar;'],
			['const foo = (await bar)[-0.0];', 'const [foo] = await bar;'],
		].map(([code, output]) => ({code, output, errors: 1})),
		// The fix removes the member access, a comment inside it would be dropped
		...[
			'const foo = (await bar) /* keep */ [0];',
			'const foo = (await bar) /* keep */ .foo;',
			'const foo = (await bar)[/* keep */ 0];',
			'const foo = (await bar) /* keep */ [1];',
		].map(code => ({code, errors: 1})),
		// Index access works on any array-like, destructuring needs the value to be iterable, so the rewrite is withheld when the awaited expression is statically not iterable
		...[
			'const foo = (await {0: 1, length: 1})[0];',
			'const foo = (await {a: 1})[0];',
			'const foo = (await 1)[1];',
			'const foo = (await (a + b))[0];',
			'const foo = (await -x)[0];',
			'const foo = (await i++)[0];',
			'const foo = (await /re/)[0];',
			'const foo = (await true)[0];',
			'const foo = (await null)[0];',
		].map(code => ({code, errors: 1})),
		// A string, a `Set`, and a value behind a call are iterable or unknown, so the documented rewrite still applies
		...[
			['const foo = (await \'abc\')[1];', 'const [, foo] = await \'abc\';'],
			['const foo = (await `abc`)[1];', 'const [, foo] = await `abc`;'],
			['const foo = (await new Set())[0];', 'const [foo] = await new Set();'],
			['const foo = (await Promise.resolve({0: 1, length: 1}))[0];', 'const [foo] = await Promise.resolve({0: 1, length: 1});'],
			['const foo = (await import("./foo.js"))[0];', 'const [foo] = await import("./foo.js");'],
		].map(([code, output]) => ({code, output, errors: 1})),
	],
});
