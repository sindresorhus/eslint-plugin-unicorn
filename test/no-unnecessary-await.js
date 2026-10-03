import test from 'node:test';
import {Linter} from 'eslint';
import outdent from 'outdent';
import plugin from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

ruleTest.snapshot({
	testerOptions: {
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
	},
	valid: [
		'await {then}',
		'await a ? b : c',
		'await a || b',
		'await a && b',
		'await a ?? b',
		'await new Foo()',
		'await tagged``',
		'class A { async foo() { await this }}',
		'async function * foo() {await (yield bar);}',
		'await (1, Promise.resolve())',
	],
	invalid: [
		'await []',
		'await [Promise.resolve()]',
		'await (() => {})',
		'await (() => Promise.resolve())',
		'await (a === b)',
		'await (a instanceof Promise)',
		'await (a > b)',
		'await class {}',
		'await class extends Promise {}',
		'await function() {}',
		'await function name() {}',
		'await function() { return Promise.resolve() }',
		'await (<></>)',
		'await (<a></a>)',
		'await 0',
		'await 1',
		'await ""',
		'await "string"',
		'await true',
		'await false',
		'await null',
		'await 0n',
		'await 1n',
		// eslint-disable-next-line no-template-curly-in-string
		'await `${Promise.resolve()}`',
		'await !Promise.resolve()',
		'await void Promise.resolve()',
		'await +Promise.resolve()',
		'await ~1',
		'await ++foo',
		'await foo--',
		'await (Promise.resolve(), 1)',
		outdent`
			async function foo() {
				return await
					// comment
					1;
			}
		`,
		outdent`
			async function foo() {
				return await
					// comment
					1
			}
		`,
		outdent`
			async function foo() {
				return( await
					// comment
					1);
			}
		`,
		outdent`
			foo()
			await []
		`,
		outdent`
			foo()
			await +1
		`,
		outdent`
			async function foo() {
				return await
					// comment
					[];
			}
		`,
		outdent`
			async function foo() {
				throw await
					// comment
					1;
			}
		`,
		outdent`
			console.log(
				await
					// comment
					[]
			);
		`,
		'async function foo() {+await +1}',
		'async function foo() {-await-1}',
		'async function foo() {+await -1}',
		// The unary operator runs after the `await`, so these are only reported
		'async function foo() {+await ++bar}',
		'async function foo() {-await --bar}',
		'async function foo() {const a = +await ++b;}',
		'async function foo() {+await --bar}',
		'async function foo() {-await ++bar}',
		'async function foo() {+await bar++}',
		'async function foo() {~await ~1}',
	],
});

// A TypeScript expression wrapper must not hide the awaited value
ruleTest.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'async function f() { return await (a as Promise<number>); }',
		'async function f() { return await (a!); }',
	],
	invalid: [
		'async function f() { return await (1 as number); }',
		'async function f() { return await ([1, 2]!); }',
		'async function f() { return await ([1, 2] as const); }',
		'async function f() { return await ([1, 2] satisfies number[]); }',
	],
});

// `await` on a value that is not a promise still suspends the function for a microtask, so removing it makes the rest of the body run in the same tick and can reorder it against the caller. The original prints `s after e`, the fix prints `s e after`.
test('only an `await` that is the last thing its function runs is unrolled', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: plugin},
		rules: {'unicorn/no-unnecessary-await': 'error'},
	};

	for (const [code, isFixed] of [
		['async function f() { log("s"); await 1; log("e"); }', false],
		['async function f() { await 1; log("e"); }', false],
		// The `await` is the last statement, so nothing runs after it either way
		['async function f() { if (q) { run(); } await 1; }', true],
		['async function f() { log("s"); await 1; }', true],
		['async function f() { await 1; }', true],
		['async function f() { return await 1; }', true],
		['async function f() { const x = await 1; }', true],
		['async function f() { if (q) { await 1; } }', true],
		['const f = async () => { await 1; };', true],
		// Something still runs after the `await` inside the last statement
		['async function f() { if (q) { await 1; log("e"); } }', false],
		['async function f() { log(await 1); }', false],
		['async function f() { for (const x of xs) { await 1; } }', false],
		['async function f() { try { await 1; } finally { log("e"); } }', false],
		['async function outer() { return async () => (await 1, log("e")); }', false],
		// An expression-bodied arrow function is its own body
		['async function outer() { const f = async () => await 1; run(); }', true],
		// A top-level `await` reorders the rest of the module the same way
		['Promise.resolve().then(() => log("a")); await 1; log("b");', false],
		['run(); await 1;', true],
	]) {
		const problem = linter.verify(code, config).find(problem => !problem.fatal);

		t.assert.ok(problem, `should report \`${code}\``);
		t.assert.strictEqual(Boolean(problem.fix), isFixed, `fix availability for \`${code}\``);
	}
});
