import {runInNewContext} from 'node:vm';
import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import plugin from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: testRule} = getTester(import.meta);

testRule.snapshot({
	valid: [
		'function foo() { if (a) { return; } }',
		'function foo() { if (a) { return; } else if (b) { return; } }',
		'function foo() { if (a) { return; } else { bar(); } if (b) { return; } }',
		'function foo() { if (a) { return; } if (b) { return; } else { bar(); } }',
		'function foo() { if (a) { return; } bar(); if (b) { return; } }',
		'function foo() { if (a) { return; } ; if (b) { return; } }',
		'function foo() { if (a) { return; } { if (b) { return; } } }',
		'function foo() { if (a) { return; } if (b) { return undefined; } }',
		'function foo() { if (a) { return true; } if (b) { return false; } }',
		'function foo() { if (a) { return error; } if (b) { throw error; } }',
		'if (a) { throw firstError; } if (b) { throw secondError; }',
		'if (a) { count++; } if (b) { count++; }',
		'if (a) {} if (b) {}',
		'if (a) { ; } if (b) { ; }',
		'function foo() { if (a) { log(); return; } if (b) { log(); return; } }',
		'function foo() { if (a) { return; ; } if (b) { return; ; } }',
		'function foo() { if (a) { { return; } } if (b) { { return; } } }',
		'function foo() { if (a) { if (c) { return; } } if (b) { if (c) { return; } } }',
		'outer: for (;;) { if (a) { break outer; } if (b) { break; } }',
		'outer: for (;;) { inner: for (;;) { if (a) { continue outer; } if (b) { continue inner; } } }',
		'for (;;) { if (a) { break; } if (b) { continue; } }',
		'switch (value) { case 1: if (a) { break; } case 2: if (b) { break; } }',
		'function foo() { if (a) { return getValue(a); } if (b) { return getValue(b); } }',
		// Do not try to prove semantic equivalence or normalize expression formatting.
		'function foo() { if (a) { return value + 1; } if (b) { return value+1; } }',
		'function foo() { if (a) { return () => { return value; }; } if (b) { return () => { return\nvalue; }; } }',
		'function foo() { if (a) { return tag`value`; } if (b) { return tag`value`; } }',
		'function foo() { if (a) { return () => tag`value`; } if (b) { return () => tag`value`; } }',
		{
			code: 'function foo() { if (a) { throw error; } if (b) { throw error; } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				type A = {type: 'a'; method(value: string): string};
				type B = {type: 'b'; method(value: number): string};
				function run(subject: A | B, argument: string | number) {
					if (subject.type === 'a' && typeof argument === 'string') {
						return subject.method(argument);
					}
					if (subject.type === 'b' && typeof argument === 'number') {
						return subject.method(argument);
					}
				}
			`,
			filename: 'file.ts',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		outdent`
			function check(ctx) {
				if (ctx.finished) {
					return;
				}
				if (!ctx.hasResult && !ctx.hasError) {
					return;
				}
			}
		`,
		'if (value < 0) { throw invalidValue; } if (!Number.isFinite(value)) { throw invalidValue; }',
		'function foo() { if (a) { return result; } if (b) { return result; } }',
		'function foo() { if (first()) { return result(); } if (second()) { return result(); } }',
		'function foo() { if (a) return; if (b) return; }',
		'function foo() { if (a) return; if (b) { return; } }',
		'function foo() { if (a) { return; } if (b) return; }',
		'function foo() { if (a) { return result; } if (b) { return result } }',
		'function foo() { if (a) { return result } if (b) { return result; } }',
		'function foo() { if (a) { return; } if (b) { return; } if (c) { return; } }',
		'function foo() { if (a) { return first; } if (b) { return first; } if (c) { return second; } if (d) { return second; } }',
		'for (;;) { if (a) { continue; } if (b) { continue; } }',
		'for (;;) { if (a) { break; } if (b) { break; } }',
		'outer: for (;;) { for (;;) { if (a) { continue outer; } if (b) { continue outer; } } }',
		'outer: { if (a) { break outer; } if (b) { break outer; } }',
		'switch (value) { case 1: if (a) { break; } if (b) { break; } }',
		'class Foo { static { if (a) { throw error; } if (b) { throw error; } } }',
		'async function foo() { if (await a) { return await result; } if (await b) { return await result; } }',
		'function* foo() { if (yield a) { return yield result; } if (yield b) { return yield result; } }',
		...['a || b', 'a && b', 'a ?? b', 'a ? b : c', 'a = b', 'a, b', '() => a', '((a))'].map(condition => `function foo() { if (${condition}) { return; } if (${condition}) { return; } }`),
		'function foo() { if (a?.b) { return result?.(); } if (c?.[d]) { return result?.(); } }',
		'function foo() { if (tag`first`) { return [...values]; } if (tag`second`) { return [...values]; } }',
		'function foo({a, b}) { if (a) { return {value}; } if (b) { return {value}; } }',
		'function foo() { if (a) return value\nif (b) { return value }\n[1].forEach(log) }',
		'function foo() { if (a) { return value }\nif (b) return value\ndone() }',
		'for (;;) { if (a) break\nif (b) break\ndone() }',
		'function foo() { if (a) { return; } if (b) { return; } /* Keep trailing comment. */ }',
		...['a as boolean', '<boolean>a', 'a!', 'a satisfies boolean', 'predicate<string>(a)'].map(condition => ({
			code: `function foo() { if (${condition}) { return; } if (b) { return; } }`,
			languageOptions: {parser: parsers.typescript},
		})),
		{
			code: 'function foo() { if (a) { return <Component value={value} />; } if (b) { return <Component value={value} />; } }',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		'function foo() { if (a) { return result; } if (b) { return (((result))); } }',
		{
			code: 'function foo() { if (<First />) { return; } if (<Second />) { return; } }',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
	],
});

testRule({
	valid: [],
	invalid: [
		'function foo() { if (a) { /* First guard. */ return; } if (b) { return; } }',
		'function foo() { if (a) { return; } /* Between guards. */ if (b) { return; } }',
		'function foo() { if (a) { return; } if (b) { /* Second guard. */ return; } }',
		'function foo() { if (a /* Condition. */) { return; } if (b) { return; } }',
		'function foo() { if (a) { return; } if (b /* Condition. */) { return; } }',
		'function foo() { if (a) { return; } // First guard.\nif (b) { return; } }',
		'function foo() { if (a) { return; }\n// eslint-disable-next-line no-console\nif (b) { return; } }',
	].map(code => ({code, errors: [{messageId: 'prefer-combined-guards'}]})),
});

const config = {
	plugins: {unicorn: plugin},
	rules: {'unicorn/prefer-combined-guards': 'error'},
};

test('repeated fixes combine all consecutive guards', t => {
	const linter = new Linter();
	const {output, messages} = linter.verifyAndFix('function foo() { if (a) { return; } if (b) { return; } if (c) { return; } }', config);
	t.is(output, 'function foo() { if (a || b || c) { return; } }');
	t.deepEqual(messages, []);
});

test('fixes compose with related control-flow rules', t => {
	const linter = new Linter();
	const {output, messages} = linter.verifyAndFix(outdent`
		function foo(a, b) {
			if (a) {
				return false;
			} else if (b) {
				return false;
			}
			return true;
		}
	`, {
		...config,
		rules: {
			...config.rules,
			'unicorn/no-duplicate-if-branches': 'error',
			'unicorn/no-useless-else': 'error',
			'unicorn/prefer-else-if': 'error',
			'unicorn/prefer-boolean-return': 'error',
		},
	});
	t.is(output, 'function foo(a, b) {\n\treturn !(a || b);\n}');
	t.deepEqual(messages, []);
});

test('fixes preserve exit values and evaluation order', t => {
	const linter = new Linter();
	for (const exit of ['return result()', 'throw result()', 'break', 'continue']) {
		for (const first of [false, true]) {
			for (const second of [false, true]) {
				const code = `
					const events = [];
					function condition(name, value) { events.push(name); return value; }
					function result() { events.push('result'); return 42; }
					function run() {
						for (let index = 0; index < 2; index++) {
							if (condition('first', ${first})) { ${exit}; }
							if (condition('second', ${second})) { ${exit}; }
							events.push('body');
						}
						events.push('after');
					}
					try { events.push(run()); } catch (error) { events.push('caught', error); }
					JSON.stringify(events);
				`;
				const {output, messages, fixed} = linter.verifyAndFix(code, config);
				t.true(fixed);
				t.deepEqual(messages, []);
				t.is(runInNewContext(output), runInNewContext(code));
			}
		}
	}
});
