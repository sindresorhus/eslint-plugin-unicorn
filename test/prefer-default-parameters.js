import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const fn = a => [a, a ?? 3];',
		'const fn = a => [a ?? 3, a ?? 4];',
		'const fn = a => [a ?? 3, a || 3];',
		'const fn = a => [a ?? 3, a ?? "3"];',
		'const fn = a => 3 ?? a;',
		'const fn = a => a && 3;',
		'const fn = a => a?.value ?? 3;',
		'const fn = a => a ?? getDefault();',
		'const fn = a => a ?? DEFAULT;',
		'const fn = a => a ?? {};',
		'const fn = a => a ?? /pattern/;',
		'const fn = a => a ?? -3;',
		'const fn = a => 3;',
		'const fn = (a = 1) => a ?? 3;',
		'const fn = ({a = 1}) => a ?? 3;',
		'const fn = ([a = 1]) => a ?? 3;',
		'const fn = (a, b) => a ?? 3;',
		'const fn = (...a) => a ?? 3;',
		'const fn = ({...a}) => a ?? 3;',
		'const fn = ([...a]) => a ?? 3;',
		'const fn = a => { a = undefined; return a ?? 3; };',
		'const fn = a => { a++; return a ?? 3; };',
		'const fn = a => { function reset() { a = undefined; } return a ?? 3; };',
		'const fn = a => { function read() { return a; } return a ?? 3; };',
		'const fn = a => { var a; return a ?? 3; };',
		'function fn(a) { "use strict"; return a ?? 3; }',
		'const a = undefined; console.log(a ?? 3);',
		'const {a} = options; console.log(a, a ?? 3);',
		'let [a] = arr; a = undefined; console.log(a ?? 3);',
		'const [a = 1] = arr; console.log(a ?? 3);',
		'const {...a} = options; console.log(a ?? 3);',
		'var [a] = arr; var a; console.log(a ?? 3);',
		'const fn = a => { { const a = 1; console.log(a ?? 3); } return a; };',
		'const {a} = options; export {a}; console.log(a ?? 3);',
		{
			code: 'function fn(a, a) { return a ?? 3; }',
			languageOptions: {sourceType: 'script'},
		},
		{
			code: 'const fn = (a: number | undefined) => (a as number) ?? 3;',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'const fn = a => [a ?? 3, a ?? 3];',
		'const fn = a => [a || 3, a || 3];',
		'const fn = a => [a ?? 3, a ?? 0x3];',
		'const fn = a => [a ?? 3n, a ?? 0x3n];',
		String.raw`const fn = a => [a ?? "default", a ?? "\u0064efault"];`,
		'const fn = a => a || false;',
		'const fn = a => a ?? null;',
		'const fn = (b, a) => a ?? 3;',
		'const fn = (a,) => a ?? 3;',
		'const fn = (a) => (a) ?? (3);',
		'const fn = a => ((a ?? 3));',
		'const fn = a => ({[a ?? 3]: a ?? 3});',
		'const fn = a => { function read() { return a ?? 3; } return a ?? 3; };',
		'const fn = a => { { const a = 1; console.log(a ?? 4); } return a ?? 3; };',
		'const fn = a => b => a ?? 3;',
		'const fn = function(a) { return a ?? 3; };',
		'async function fn(a) { return a ?? 3; }',
		'function * fn(a) { yield a ?? 3; }',
		'const object = { fn(a) { return a ?? 3; } };',
		'class Class { fn(a) { return a ?? 3; } }',
		'const fn = ({a}, b) => a ?? 3;',
		'const fn = ([a]) => a ?? 3;',
		'const fn = ({property: a}) => a ?? 3;',
		'const fn = ({nested: {a}}) => a ?? 3;',
		'const fn = ([[a]]) => a ?? 3;',
		'const fn = ({a} = {}) => a ?? 3;',
		'const fn = ({a, b = a ?? 3}) => b;',
		'const fn = ({a, b}) => [a ?? 3, b || 4];',
		'const {property: a} = options; console.log(a ?? 3);',
		'const {nested: [a]} = options; console.log(a ?? 3);',
		'const [a] = arr; console.log(a ?? 3, a ?? 3);',
		'let {a} = options; console.log(a ?? 3);',
		'for (const [a] of arrays) { console.log(a ?? 3); }',
		'const {a} = options; const fn = () => a ?? 3;',
		'const {a} = options, [b] = arr; console.log(a ?? 3, b ?? 4);',
		'const fn = (a /* Keep comment. */) => (/* Keep comment. */ a ?? 3);',
		'const fn = ({a /* Keep comment. */}) => a ?? 3;',
		'const fn = a => a /* Keep comment. */ ?? 3;',
		'const fn = a => a ?? /* Keep comment. */ 3;',
		'const fn = a => [a ?? 3, a ?? /* Keep comment. */ 3];',
		'const [a] = arr; console.log(a ?? // Keep comment.\n3);',
		'function fn(a) {\r\n  return a ?? 3;\r\n}',
		outdent`
			function abc(foo) {
				const {bar} = foo || 123;
			}
		`,
		outdent`
			function abc(foo) {
				const bar = foo || 'bar', keep = sideEffect();
			}
		`,
		outdent`
			function abc(bar, foo) {
				var bar = foo || 'bar';
			}
		`,
		outdent`
			function abc({bar}, foo) {
				var bar = foo || 'bar';
			}
		`,
		{
			code: 'const fn = (a?: number) => a ?? 3;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const fn = (a?: number,) => a ?? 3;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const fn = (a: number | undefined) => a ?? 3;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const fn = ({a}: {a?: number}) => a ?? 3;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const [a]: [number?] = arr; console.log(a ?? 3);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const fn = (a /* Keep comment. */: number | undefined) => a ?? 3;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const fn = <Value,>(a: number | undefined) => <span>{a ?? 3}</span>;',
			languageOptions: {parser: parsers.typescript, parserOptions: {ecmaFeatures: {jsx: true}}},
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'const fn = a => a ?? 3;',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const fn = (a = 3) => a;'}],
			}],
		},
		{
			code: 'const fn = ({ a }) => a ?? 3;',
			errors: [{
				messageId: 'preferDestructuringDefaultOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const fn = ({ a = 3 }) => a;'}],
			}],
		},
		{
			code: 'const [a] = arr; console.log(a ?? 3);',
			errors: [{
				messageId: 'preferDestructuringDefaultOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const [a = 3] = arr; console.log(a);'}],
			}],
		},
	],
});

const invalidTestCase = ({code, suggestions}) => {
	if (!suggestions) {
		return {
			code,
			errors: [{
				messageId: 'preferDefaultParameters',
			}],
		};
	}

	return {
		code,
		errors: suggestions.map(suggestion => ({
			messageId: 'preferDefaultParameters',
			suggestions: [{
				messageId: 'preferDefaultParametersSuggest',
				output: suggestion,
			}],
		})),
	};
};

test({
	valid: [
		'function abc(foo = { bar: 123 }) { }',
		'function abc({ bar } = { bar: 123 }) { }',
		'function abc({ bar = 123 } = { bar }) { }',
		'function abc(foo = fooDefault) { }',
		'function abc(foo = {}) { }',
		'function abc(foo = \'bar\') { }',
		'function abc({ bar = 123 } = {}) { }',
		'const abc = (foo = \'bar\') => { };',
		'foo = foo || \'bar\';',
		'const bar = foo || \'bar\';',
		'const abc = function(foo = { bar: 123 }) { }',
		'const abc = function({ bar } = { bar: 123 }) { }',
		'const abc = function({ bar = 123 } = {}) { }',
		outdent`
			function abc(foo) {
				foo = foo || bar();
			}
		`,
		outdent`
			function abc(foo) {
				foo = foo || {bar};
			}
		`,
		outdent`
			function abc(foo, bar) {
				bar = foo || 'bar';
			}
		`,
		outdent`
			function abc(foo, bar) {
				foo = foo || 'bar';
				baz();
			}
		`,
		outdent`
			function abc(foo) {
				foo = foo && 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				foo &&= 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				foo ||= bar();
			}
		`,
		outdent`
			function abc(foo) {
				foo.bar ||= 'bar';
			}
		`,
		outdent`
			function abc(foo, bar) {
				foo ||= 'bar';
			}
		`,
		{
			code: outdent`
				function abc(foo, foo) {
					foo ||= 'bar';
				}
			`,
			languageOptions: {sourceType: 'script'},
		},
		outdent`
			function abc(foo) {
				const bar = foo;
				foo ||= 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				bar();
				foo ||= 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				if (condition) {
					foo ||= 'bar';
				}
			}
		`,
		outdent`
			function abc(foo) {
				'use strict';
				foo ??= 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				foo = foo || 1 && 2 || 3;
			}
		`,
		outdent`
			function abc(foo) {
				foo = !foo || 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				foo = (foo && bar) || baz;
			}
		`,
		outdent`
			function abc(foo = 123) {
				foo = foo || 'bar';
			}
		`,
		outdent`
			function abc() {
				let foo = 123;
				foo = foo || 'bar';
			}
		`,
		outdent`
			function abc() {
				let foo = 123;
				const bar = foo || 'bar';
			}
		`,
		outdent`
			const abc = (foo, bar) => {
				bar = foo || 'bar';
			};
		`,
		outdent`
			const abc = function(foo, bar) {
				bar = foo || 'bar';
			}
		`,
		outdent`
			const abc = function(foo) {
				foo = foo || bar();
			}
		`,
		outdent`
			function abc(foo) {
				function def(bar) {
					foo = foo || 'bar';
				}
			}
		`,
		outdent`
			function abc(foo) {
				const bar = foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo) {
				bar(foo = foo || 1);
				baz(foo);
			}
		`,
		// The following tests check references and side effects
		outdent`
			function abc(foo) {
				console.log(foo);
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo) {
				console.log(foo);
				foo = foo || 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				const bar = foo || 'bar';
				console.log(foo, bar);
			}
		`,
		outdent`
			function abc(foo) {
				let bar = 123;
				bar = foo;
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo) {
				bar();
				foo = foo || 123;
			}
		`,
		outdent`
			const abc = (foo) => {
				bar();
				foo = foo || 123;
			};
		`,
		outdent`
			const abc = function(foo) {
				bar();
				foo = foo || 123;
			};
		`,
		outdent`
			function abc(foo) {
				sideEffects();
				foo = foo || 123;

				function sideEffects() {
					foo = 456;
				}
			}
		`,
		outdent`
			function abc(foo) {
				const bar = sideEffects();
				foo = foo || 123;

				function sideEffects() {
					foo = 456;
				}
			}
		`,
		outdent`
			function abc(foo) {
				const bar = sideEffects() + 123;
				foo = foo || 123;

				function sideEffects() {
					foo = 456;
				}
			}
		`,
		outdent`
			function abc(foo) {
				const bar = !sideEffects();
				foo = foo || 123;

				function sideEffects() {
					foo = 456;
				}
			}
		`,
		// `new`, dynamic `import()`, and tagged templates can also have side effects before the assignment
		outdent`
			function abc(foo) {
				new SideEffects();
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo) {
				import('side-effects');
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo) {
				sideEffects\`template\`;
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo) {
				const bar = function() {
					foo = 456;
				}
				foo = foo || 123;
			}
		`,
		// Last parameter is `RestElement`
		outdent`
			function abc(...foo) {
				foo = foo || 'bar';
			}
		`,
		// Last parameter is `AssignmentPattern`
		outdent`
			function abc(foo = 'bar') {
				foo = foo || 'baz';
			}
		`,
	],
	invalid: [
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || 123;
				}
			`,
			suggestions: [outdent`
				function abc(foo = 123) {
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || true;
				}
			`,
			suggestions: [outdent`
				function abc(foo = true) {
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || 123;
					console.log(foo);
				}
			`,
			suggestions: [outdent`
				function abc(foo = 123) {
					console.log(foo);
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					const bar = foo || 'bar';
				}
			`,
			suggestions: [outdent`
				function abc(bar = 'bar') {
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					let bar = foo || 'bar';
				}
			`,
			suggestions: [outdent`
				function abc(bar = 'bar') {
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc({baz}, foo) {
					const bar = foo || 'bar';
					console.log(baz, bar);
				}
			`,
			suggestions: [outdent`
				function abc({baz}, bar = 'bar') {
					console.log(baz, bar);
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = function(foo) {
					foo = foo || 123;
				}
			`,
			suggestions: [outdent`
				const abc = function(foo = 123) {
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = (foo) => {
					foo = foo || 'bar';
				};
			`,
			suggestions: [outdent`
				const abc = (foo = 'bar') => {
				};
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = foo => {
					foo = foo || 'bar';
				};
			`,
			suggestions: [outdent`
				const abc = (foo = 'bar') => {
				};
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = (foo) => {
					const bar = foo || 'bar';
				};
			`,
			suggestions: [outdent`
				const abc = (bar = 'bar') => {
				};
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || 'bar';
					bar();
					baz();
				}
			`,
			suggestions: [outdent`
				function abc(foo = 'bar') {
					bar();
					baz();
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo ?? 123;
				}
			`,
			suggestions: [outdent`
				function abc(foo = 123) {
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo ||= 'bar';
				}
			`,
			suggestions: [outdent`
				function abc(foo = 'bar') {
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = foo => {
					foo ??= 'bar';
				};
			`,
			suggestions: [outdent`
				const abc = (foo = 'bar') => {
				};
			`],
		}),
		{
			code: outdent`
				function abc(foo?: string) {
					foo ??= 'bar';
				}
			`,
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [{
					messageId: 'preferDefaultParametersSuggest',
					output: outdent`
						function abc(foo: string = 'bar') {
						}
					`,
				}],
			}],
		},
		{
			code: outdent`
				function abc(foo: string | undefined) {
					const bar: string = foo || 'bar';
					consumeString(bar);
				}
			`,
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [{
					messageId: 'preferDefaultParametersSuggest',
					output: outdent`
						function abc(bar: string = 'bar') {
							consumeString(bar);
						}
					`,
				}],
			}],
		},
		{
			code: outdent`
				function abc(foo /* Keep comment. */: string) {
					foo ??= 'bar';
				}
			`,
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [],
			}],
		},
		{
			code: outdent`
				function abc(foo) {
					foo ||= /* Keep comment. */ 'bar';
				}
			`,
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [],
			}],
		},
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					const bar = foo || 'bar';
					console.log(bar);
				}
			`,
			suggestions: [outdent`
				function abc(bar = 'bar') {
					console.log(bar);
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = function(foo) {
					const bar = foo || 'bar';
					console.log(bar);
				}
			`,
			suggestions: [outdent`
				const abc = function(bar = 'bar') {
					console.log(bar);
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				foo = {
					abc(foo) {
						foo = foo || 123;
					}
				};
			`,
			suggestions: [outdent`
				foo = {
					abc(foo = 123) {
					}
				};
			`],
		}),
		invalidTestCase({
			code: outdent`
				foo = {
					abc(foo) {
						foo = foo || 123;
					},
					def(foo) { }
				};
			`,
			suggestions: [outdent`
				foo = {
					abc(foo = 123) {
					},
					def(foo) { }
				};
			`],
		}),
		invalidTestCase({
			code: outdent`
				class Foo {
					abc(foo) {
						foo = foo || 123;
					}
				}
			`,
			suggestions: [outdent`
				class Foo {
					abc(foo = 123) {
					}
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				class Foo {
					abc(foo) {
						foo = foo || 123;
					}
					def(foo) { }
				}
			`,
			suggestions: [outdent`
				class Foo {
					abc(foo = 123) {
					}
					def(foo) { }
				}
			`],
		}),
		// The following tests verify the correct code formatting
		invalidTestCase({
			code: 'function abc(foo) { foo = foo || \'bar\'; }',
			suggestions: ['function abc(foo = \'bar\') { }'],
		}),
		invalidTestCase({
			code: 'function abc(foo) { foo = foo || \'bar\';}',
			suggestions: ['function abc(foo = \'bar\') { }'],
		}),
		invalidTestCase({
			code: 'const abc = function(foo) { foo = foo || \'bar\';}',
			suggestions: ['const abc = function(foo = \'bar\') { }'],
		}),
		invalidTestCase({
			code: 'const abc = (foo,) => { foo ??= 3; };',
			suggestions: ['const abc = (foo = 3,) => { };'],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || 'bar'; bar(); baz();
				}
			`,
			suggestions: [outdent`
				function abc(foo = 'bar') {
					bar(); baz();
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || 'bar';
					function def(bar) {
						bar = bar || 'foo';
					}
				}
			`,
			suggestions: [outdent`
				function abc(foo = 'bar') {
					function def(bar) {
						bar = bar || 'foo';
					}
				}
			`, outdent`
				function abc(foo) {
					foo = foo || 'bar';
					function def(bar = 'foo') {
					}
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo += 'bar';
					function def(bar) {
						bar = bar || 'foo';
					}
					function ghi(baz) {
						const bay = baz || 'bar';
					}
					foo = foo || 'bar';
				}
			`,
			suggestions: [outdent`
				function abc(foo) {
					foo += 'bar';
					function def(bar = 'foo') {
					}
					function ghi(baz) {
						const bay = baz || 'bar';
					}
					foo = foo || 'bar';
				}
			`, outdent`
				function abc(foo) {
					foo += 'bar';
					function def(bar) {
						bar = bar || 'foo';
					}
					function ghi(bay = 'bar') {
					}
					foo = foo || 'bar';
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				foo = {
					abc(foo) {
						foo = foo || 123;
					},
					def(foo) {
						foo = foo || 123;
					}
				};
			`,
			suggestions: [outdent`
				foo = {
					abc(foo = 123) {
					},
					def(foo) {
						foo = foo || 123;
					}
				};
			`, outdent`
				foo = {
					abc(foo) {
						foo = foo || 123;
					},
					def(foo = 123) {
					}
				};
			`],
		}),
		invalidTestCase({
			code: outdent`
				class Foo {
					abc(foo) {
						foo = foo || 123;
					}
					def(foo) {
						foo = foo || 123;
					}
				}
			`,
			suggestions: [outdent`
				class Foo {
					abc(foo = 123) {
					}
					def(foo) {
						foo = foo || 123;
					}
				}
			`, outdent`
				class Foo {
					abc(foo) {
						foo = foo || 123;
					}
					def(foo = 123) {
					}
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					const noSideEffects = 123;
					foo = foo || 123;
				}
			`,
			suggestions: [outdent`
				function abc(foo = 123) {
					const noSideEffects = 123;
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = function(foo) {
					let bar = true;
					bar = false;

					foo = foo || 123;
					console.log(foo);
				}
			`,
			suggestions: [outdent`
				const abc = function(foo = 123) {
					let bar = true;
					bar = false;

					console.log(foo);
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					const bar = function() {};
					foo = foo || 123;
				}
			`,
			suggestions: [outdent`
				function abc(foo = 123) {
					const bar = function() {};
				}
			`],
		}),
	],
});

test({
	valid: [
		outdent`
			function abc(foo, bar) {
				const { baz, ...rest } = bar;
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo, bar) {
				const baz = foo?.bar;
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo, bar) {
				import('foo');
				foo = foo || 123;
			}
		`,
	],
	invalid: [],
});
