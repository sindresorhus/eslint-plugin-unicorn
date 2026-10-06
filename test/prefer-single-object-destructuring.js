import {runInNewContext} from 'node:vm';
import test from 'node:test';
import {Linter} from 'eslint';
import outdent from 'outdent';
import unicorn from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: testRule} = getTester(import.meta);
const ruleConfig = {
	plugins: {unicorn},
	rules: {'unicorn/prefer-single-object-destructuring': 'error'},
};

testRule.snapshot({
	valid: [
		'const {bar, baz} = foo;',
		outdent`
			const {bar} = foo;
			const {baz} = foo;
		`,
		outdent`
			let foo = {};
			const {bar} = foo;
			const {baz} = foo;
		`,
		outdent`
			import foo from 'foo';
			const {bar} = foo;
			const {baz} = foo;
		`,
		outdent`
			function unicorn(foo) {
				const {bar} = foo;
				const {baz} = foo;
			}
		`,
		outdent`
			const {bar} = foo;
			let {baz} = foo;
		`,
		outdent`
			var {bar} = foo;
			var {baz} = foo;
		`,
		outdent`
			const {bar} = foo;
			const {baz} = other;
		`,
		outdent`
			const {bar} = foo;
			console.log(bar);
			const {baz} = foo;
		`,
		outdent`
			const {bar} = foo, {baz} = foo;
		`,
		outdent`
			const {bar} = foo.bar;
			const {baz} = foo.bar;
		`,
		outdent`
			const {bar} = foo();
			const {baz} = foo();
		`,
		outdent`
			const {bar, ...rest} = foo;
			const {baz} = foo;
		`,
		outdent`
			const {bar: {qux}} = foo;
			const {baz} = foo;
		`,
		outdent`
			const {bar = 1} = foo;
			const {baz} = foo;
		`,
		outdent`
			const {[bar]: value} = foo;
			const {baz} = foo;
		`,
		outdent`
			const {
				// comment
				bar
			} = foo;
			const {baz} = foo;
		`,
		outdent`
			const {bar} = foo;
			const {
				// comment
				baz
			} = foo;
		`,
		outdent`
			const {bar} = foo;
			// comment
			const {baz} = foo;
		`,
		outdent`
			export const {bar} = foo;
			export const {baz} = foo;
		`,
		{
			code: outdent`
				const {bar}: Foo = foo;
				const {baz}: Foo = foo;
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				declare const {bar}: Foo;
				declare const {baz}: Foo;
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				declare const foo: Foo;
				const {bar} = foo;
				const {baz} = foo;
			`,
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		outdent`
			const foo = {};
			const {bar} = foo;
			const {baz} = foo;
		`,
		outdent`
			const foo = {};
			let {bar} = foo;
			let {baz} = foo;
		`,
		outdent`
			const foo = {};
			const {bar: renamed} = foo;
			const {baz} = foo;
		`,
		outdent`
			const foo = {};
			const {'bar': bar} = foo;
			const {baz} = foo;
		`,
		outdent`
			for (const foo of foos) {
				const {bar} = foo;
				const {baz} = foo;
			}
		`,
		outdent`
			const foo = {};
			const {
				bar
			} = foo;
			const {
				baz
			} = foo;
		`,
		outdent`
			{
				const foo = {};
				const {bar} = foo;
				const {baz} = foo;
			}
		`,
		outdent`
			class Foo {
				static {
					const foo = {};
					const {bar} = foo;
					const {baz} = foo;
				}
			}
		`,
		outdent`
			switch (value) {
				case 1:
					const foo = {};
					const {bar} = foo;
					const {baz} = foo;
			}
		`,
	],
});

// Merging would put the same key in one pattern twice, which is valid but reads like a mistake
testRule({
	valid: [
		'const source = x;\nconst {a} = source;\nconst {a: b} = source;\nconsole.log(a, b);',
		'const source = x;\nconst {a: b} = source;\nconst {a: c} = source;\nconsole.log(b, c);',
	],
	invalid: [
		{
			code: 'const source = x;\nconst {a} = source;\nconst {b: c} = source;\nconsole.log(a, c);',
			output: 'const source = x;\nconst {a, b: c} = source;\nconsole.log(a, c);',
			errors: 1,
		},
	],
});

testRule.snapshot({
	valid: [
		'const foo = getFoo(); const {bar} = foo; consume(foo);',
		'const foo = getFoo(); const {bar} = foo; foo = other;',
		'const foo = getFoo(); const {bar} = foo; function useFoo() { return foo; }',
		'const foo = getFoo(); const {bar} = foo; export {foo};',
		'export const foo = getFoo(); const {bar} = foo;',
		'const foo = getFoo(); export const {bar} = foo;',
		'const foo = getFoo(); consume(); const {bar} = foo;',
		'const foo = getFoo(), other = getOther(); const {bar} = foo;',
		'const foo = getFoo(); const {bar} = foo, other = getOther();',
		'let foo = getFoo(); const {bar} = foo;',
		'var foo = getFoo(); const {bar} = foo;',
		'const foo = getFoo(); var {bar} = foo;',
		'const other = getOther(); const foo = getFoo(); const {bar} = other;',
		'consume(foo); const foo = getFoo(); const {bar} = foo;',
		'const foo = getFoo(); const {} = foo;',
		'const foo = getFoo(); const {bar, ...rest} = foo;',
		'const foo = getFoo(); const {bar: {baz}} = foo;',
		'const foo = getFoo(); const {bar = 1} = foo;',
		'const foo = getFoo(); const {[key]: bar} = foo;',
		'const foo = () => {}; const {name} = foo;',
		'const foo = (function () {}); const {name} = foo;',
		'const foo = class {}; const {name} = foo;',
		'const foo = function named() {}; const {name} = foo;',
		'const foo = class Named {}; const {name} = foo;',
		'const foo = {bar: 1, baz: 2}; const {bar} = foo;',
		'const foo = condition ? first : second; const {bar} = foo;',
		'const foo = (first, second); const {bar} = foo;',
		'const foo = first || second; const {bar} = foo;',
		'const foo = getFoo(() => foo); const {bar} = foo;',
		...[
			'const foo: Foo = getFoo(); const {bar} = foo;',
			'const foo = getFoo(); const {bar}: Foo = foo;',
			'declare const foo: Foo; const {bar} = foo;',
			'const foo = getFoo(); const {bar} = foo; type Foo = typeof foo;',
			'const foo = (() => {}) as Foo; const {name} = foo;',
			'const foo = (function () {}) satisfies Foo; const {name} = foo;',
			'const foo = (class {})!; const {name} = foo;',
			'const foo = <Foo>(() => {}); const {name} = foo;',
			'const foo = (function<T>() {})<number>; const {name} = foo;',
			'const foo = (class<T> {})<number>; const {name} = foo;',
			'const foo = (<T>() => {})<number>; const {name} = foo;',
			'const foo = ((() => {}) as unknown as Foo)!; const {name} = foo;',
			'const foo = {bar: 1, baz: 2}; const {bar} = foo;',
			'const foo = {bar: 1, baz: 2} as const; const {bar} = foo;',
			'const foo = condition ? {bar: 1, baz: 2} : {bar: 2, baz: 3}; const {bar} = foo;',
			'const foo = (other, {bar: 1, baz: 2}); const {bar} = foo;',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	],
	invalid: [
		'const foo = getFoo();\nconst {bar, baz} = foo;',
		'const foo = getFoo();\nconst {bar} = foo;\nconst {baz} = foo;',
		'const foo = getFoo(); const {bar: renamed} = foo;',
		'const foo = getFoo(); let {bar} = foo; bar = other;',
		'const foo = ((getFoo())); const {bar} = (foo);',
		'const foo = getFoo()?.bar; const {baz} = foo;',
		'const foo = source; const {bar} = foo;',
		'const foo = source.bar; const {baz} = foo;',
		'const foo = new Foo(); const {bar} = foo;',
		'const foo = getFoo`value`; const {bar} = foo;',
		'const foo = await getFoo(); const {bar} = foo;',
		'const foo = getFoo(); const {bar} = foo; function other(foo) { return foo; }',
		'function useFoo() { const foo = getFoo(); const {bar} = foo; return bar; }',
		'{ const foo = getFoo(); const {bar} = foo; }',
		'class Foo { static { const foo = getFoo(); const {bar} = foo; } }',
		'switch (value) { case 1: const foo = getFoo(); const {bar} = foo; }',
		outdent`
			const foo = getFoo({
				bar: 1,
			});
			const {
				bar,
			} = foo;
		`,
		...[
			'const foo = getFoo() as Foo; const {bar} = foo;',
			'const foo = <Foo>getFoo(); const {bar} = foo;',
			'const foo = getFoo()!; const {bar} = foo;',
			'const foo = getFoo() satisfies Foo; const {bar} = foo;',
			'const foo = getFoo<Foo>(); const {bar} = foo;',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	],
});

testRule({
	valid: [],
	invalid: [
		{
			code: 'function useFoo() {\r\n  const foo = getFoo({\r\n    bar: 1,\r\n  });\r\n  const {bar} = foo;\r\n}',
			output: 'function useFoo() {\r\n  const {bar} = getFoo({\r\n    bar: 1,\r\n  });\r\n}',
			errors: [{messageId: 'prefer-direct-object-destructuring'}],
		},
		{
			code: 'const foo = ((getFoo() as Foo) satisfies Foo)!; const {bar} = foo;',
			output: 'const {bar} = ((getFoo() as Foo) satisfies Foo)!;',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-direct-object-destructuring'}],
		},
		{
			code: 'const foo = getFoo();\nconst {bar} = foo; // trailing\nconsume(bar);',
			output: 'const {bar} = getFoo(); // trailing\nconsume(bar);',
			errors: [{messageId: 'prefer-direct-object-destructuring'}],
		},
	],
});

test('merges destructurings and inlines their source across fix passes', t => {
	const linter = new Linter();
	const result = linter.verifyAndFix('const foo = getFoo();\nconst {bar} = foo;\nconst {baz} = foo;', ruleConfig);

	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(result.output, 'const {bar, baz} = getFoo();');
	t.assert.strictEqual(linter.verifyAndFix(result.output, ruleConfig).fixed, false);
});

test('inlines chained source aliases across fix passes', t => {
	const linter = new Linter();
	const result = linter.verifyAndFix('const original = getFoo();\nconst source = original;\nconst {bar} = source;', ruleConfig);

	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(result.output, 'const {bar} = getFoo();');
	t.assert.strictEqual(linter.verifyAndFix(result.output, ruleConfig).fixed, false);
});

test('keeps a source with additional reads when merging destructurings', t => {
	const linter = new Linter();
	const result = linter.verifyAndFix('const foo = getFoo();\nconst {bar} = foo;\nconst {baz} = foo;\nconsume(foo);', ruleConfig);

	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(result.output, 'const foo = getFoo();\nconst {bar, baz} = foo;\nconsume(foo);');
});

for (const declarationKind of ['const', 'let']) {
	test(`merges three ${declarationKind} destructurings and inlines their source`, t => {
		const linter = new Linter();
		const result = linter.verifyAndFix(`const foo = getFoo();\n${declarationKind} {bar} = foo;\n${declarationKind} {baz} = foo;\n${declarationKind} {qux} = foo;`, ruleConfig);

		t.assert.strictEqual(result.fixed, true);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(result.output, `${declarationKind} {bar, baz, qux} = getFoo();`);
		t.assert.strictEqual(linter.verifyAndFix(result.output, ruleConfig).fixed, false);
	});
}

test('inlining evaluates the initializer once and preserves mutable bindings', t => {
	const linter = new Linter();
	const result = linter.verifyAndFix('const foo = getFoo(); let {bar} = foo; bar++; bar;', ruleConfig);
	let calls = 0;
	const value = runInNewContext(result.output, {
		getFoo() {
			calls++;
			return {bar: 1};
		},
	});

	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(value, 2);
	t.assert.strictEqual(calls, 1);
});

testRule.snapshot({
	valid: [],
	invalid: [
		'const foo = /* comment */ getFoo(); const {bar} = foo;',
		'const foo = getFoo(); /* comment */ const {bar} = foo;',
		'const foo = getFoo(); const {/* comment */ bar} = foo;',
		'const foo = getFoo(); const {/* comment */ bar} = foo; const {baz} = foo;',
		'const foo = getFoo(); const {bar} = foo; /* comment */ const {baz} = foo;',
		'const foo = getFoo(); const {bar} = foo; const {/* comment */ baz} = foo;',
	],
});
