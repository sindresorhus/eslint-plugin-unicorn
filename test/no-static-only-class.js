import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Empty class
		'class A {}',
		'const A = class {}',
		// `superClass`
		'class A extends B { static a() {}; }',
		'const A = class extends B { static a() {}; }',
		// Not static
		'class A { a() {} }',
		'class A { constructor() {} }',
		'class A { get a() {} }',
		'class A { set a(value) {} }',
		// `private`
		'class A3 { static #a() {}; }',
		'class A3 { static #a = 1; }',
		'const A3 = class { static #a() {}; }',
		'const A3 = class { static #a = 1; }',
		// Static block
		'class A2 { static {}; }',
	],
	invalid: [
		'class A { static a() {}; }',
		'class A { static a() {} }',
		// Static accessors
		'class A { static get a() { return 1; } }',
		'class A { static set a(v) {} }',
		'class A { static get a() { return 1; } static set a(v) {} }',
		'const A = class A { static a() {}; }',
		'const A = class { static a() {}; }',
		'class A { static constructor() {}; }',
		'export default class A { static a() {}; }',
		'export default class { static a() {}; }',
		'export class A { static a() {}; }',
		outdent`
			function a() {
				return class
				{
					static a() {}
				}
			}
		`,
		outdent`
			function a() {
				return class /* comment */
				{
					static a() {}
				}
			}
		`,
		outdent`
			function a() {
				return class // comment
				{
					static a() {}
				}
			}
		`,
		// Breaking edge cases
		outdent`
			class A {static a(){}}
			class B extends A {}
		`,
		outdent`
			class A {static a(){}}
			console.log(typeof A)
		`,
		outdent`
			class A {static a(){}}
			const a = new A;
		`,
	],
});

const noFixingCase = code => ({
	code,
	errors: 1,
});

test.typescript({
	valid: [
		// `private`
		'class A { static #a() {}; }',
		'class A { static #a = 1; }',
		'const A = class { static #a() {}; }',
		'const A = class { static #a = 1; }',
		// TS class
		'class A { static public a = 1; }',
		'class A { static private a = 1; }',
		'class A { static readonly a = 1; }',
		'class A { static declare a = 1; }',
		// `override` members cannot be moved to an object literal
		'class A { static override a = 1; }',
		'class A { override static a = 1; }',
		'class A { static override a() {} }',
		// Static block
		'class A { static {}; }',
	],
	invalid: [
		{
			code: outdent`
				class A {
					static a
					static b = 1
					static [c] = 2
					static [d]
					static e() {}
					static [f]() {}
				}
			`,
			output: outdent`
				const A = {
					a: undefined,
					b : 1,
					[c] : 2,
					[d]: undefined,
					e() {},
					[f]() {},
				};
			`,
			errors: 1,
		},
		{
			code: outdent`
				class A {
					static a;
					static b = 1;
					static [((c))] = ((2));
					static [d];
					static e() {};
					static [f]() {};
				}
			`,
			output: outdent`
				const A = {
					a: undefined,
					b : 1,
					[((c))] : ((2)),
					[d]: undefined,
					e() {},
					[f]() {},
				};
			`,
			errors: 1,
		},
		// Comments
		{
			code: outdent`
				/* */
				class /* */ A /* */ {
					/* */ static /* */ a /* */; /* */
					/* */ static /* */ b /* */ = /* */ 1 /* */; /* */
					/* */ static /* */ [ /* */ c /* */ ] /* */ = /* */ 2 /* */;  /* */
					/* */ static /* */ [/* */ d /* */] /* */;  /* */
					/* */ static /* */ /* */ e /* */ ( /* */ ) {/* */}/* */;  /* */
					/* */ static /* */ [/* */ f /* */ ] /* */ ( /* */ ) {/* */ }/* */ ;  /* */
				}
				/* */
			`,
			output: outdent`
				/* */
				const /* */ A /* */ = {
					/* */ /* */ a /* */: undefined, /* */
					/* */ /* */ b /* */ : /* */ 1 /* */, /* */
					/* */ /* */ [ /* */ c /* */ ] /* */ : /* */ 2 /* */,  /* */
					/* */ /* */ [/* */ d /* */] /* */: undefined,  /* */
					/* */ /* */ /* */ e /* */ ( /* */ ) {/* */}/* */,  /* */
					/* */ /* */ [/* */ f /* */ ] /* */ ( /* */ ) {/* */ }/* */ ,  /* */
				};
				/* */
			`,
			errors: 1,
		},
		// `this`
		noFixingCase(outdent`
			class A {
				static a = 1;
				static b = this.a;
			}
		`),
		// `this` in `key` should fixable
		{
			code: 'class A {static [this.a] = 1}',
			output: 'const A = {[this.a] : 1,};',
			errors: 1,
		},
		// This case should be fixable, but we simply check code of value includes `this`
		noFixingCase(outdent`
			class A {
				static a = 1;
				static b = "this";
			}
		`),
		noFixingCase('declare class A { static a = 1; }'),
		noFixingCase('abstract class A { static a = 1; }'),
		noFixingCase('class A implements B { static a = 1; }'),
		// https://github.com/microsoft/vscode/blob/11cd76005bc7516dcc726d7389d0bce1744e5c85/src/vs/workbench/contrib/notebook/browser/notebookKernelAssociation.ts#L12
		noFixingCase(outdent`
			class NotebookKernelProviderAssociationRegistry {
				static extensionIds: (string | null)[] = [];
				static extensionDescriptions: string[] = [];
			}
		`),
	],
});

test({
	valid: [
		// `private`
		'class A2 { static #a() {}; }',
		'class A2 { static #a = 1; }',
		'const A2 = class { static #a() {}; }',
		'const A2 = class { static #a = 1; }',
		// Static block
		'class A2 { static {}; }',
	],
	invalid: [
		{
			code: 'class A { static a() {} }',
			output: 'const A = { a() {}, };',
			errors: 1,
		},
		// A static field initializer can reference the class binding, which a `const` cannot
		{
			code: 'class A { static x = A; }',
			errors: 1,
		},
		{
			code: 'class A { static x = new A(); }',
			errors: 1,
		},
		{
			code: 'class A { static x = A.name; static y = 1; }',
			errors: 1,
		},
		{
			code: 'class A { static [A.name] = 1; }',
			errors: 1,
		},
		// A computed key is evaluated while the class is being created, so the class binding is initialized there, but the `const` the class becomes is in its temporal dead zone
		{
			code: 'class A { static [A]() {} }',
			errors: 1,
		},
		{
			code: 'class A { static [A.name]() {} }',
			errors: 1,
		},
		{
			code: 'class A { static get [A]() {} }',
			errors: 1,
		},
		{
			code: 'class A { static [A] = 1; static [A.x]() {} }',
			errors: 1,
		},
		// `new.target` only exists in a class static field, not in an object literal
		{
			code: 'class A { static x = new.target; }',
			errors: 1,
		},
		{
			code: 'class A { static x = () => new.target; }',
			errors: 1,
		},
		// `super` is a keyword of the enclosing class, it does not exist in an object literal
		{
			code: 'class A { static x = super.toString; }',
			errors: 1,
		},
		{
			code: 'class A { static x = () => super.x; }',
			errors: 1,
		},
	],
});

// A concise arrow body is an expression, the object literal must stay parenthesized
test({
	valid: [],
	invalid: [
		...[
			['const a = () => class {\n\tstatic x = 1;\n};', 'const a = () => ({\n\tx : 1,\n});'],
			['const a = () => class {\n\tstatic x = 1;\n}', 'const a = () => ({\n\tx : 1,\n})'],
			// The class starts the concise body, but is only part of it
			['const a = () => class {\n\tstatic x = 1;\n}.x;', 'const a = () => ({\n\tx : 1,\n}).x;'],
			// Already parenthesized
			['const a = () => (class {\n\tstatic x = 1;\n}).x;', 'const a = () => ({\n\tx : 1,\n}).x;'],
		].map(([code, output]) => ({code, output, errors: 1})),
		...[
			['const a = () => class {\n\tstatic x = 1;\n} as Foo;', 'const a = () => ({\n\tx : 1,\n}) as Foo;'],
			['const a = () => class {\n\tstatic x = 1;\n}!;', 'const a = () => ({\n\tx : 1,\n})!;'],
		].map(([code, output]) => ({
			code,
			output,
			errors: 1,
			languageOptions: {parser: parsers.typescript},
		})),
	],
});

// `export default {…}` is an expression, a following `(`, `[`, `` ` ``, `+`, `-` or `/` would continue it instead of starting a new statement
test({
	valid: [],
	invalid: [
		...[
			['(function () {})();', 'export default {\n\tx : 1,\n};\n(function () {})();'],
			['[1, 2].forEach(fn);', 'export default {\n\tx : 1,\n};\n[1, 2].forEach(fn);'],
			['`x`;', 'export default {\n\tx : 1,\n};\n`x`;'],
			['+1;', 'export default {\n\tx : 1,\n};\n+1;'],
			['/foo/.test(x);', 'export default {\n\tx : 1,\n};\n/foo/.test(x);'],
		].map(([next, output]) => ({
			code: 'export default class {\n\tstatic x = 1;\n}\n' + next,
			output,
			errors: 1,
		})),
		// Nothing follows, no semicolon is needed
		{
			code: 'export default class {\n\tstatic x = 1;\n}',
			output: 'export default {\n\tx : 1,\n}',
			errors: 1,
		},
		// A statement that cannot continue an expression does not need one either
		{
			code: 'export default class {\n\tstatic x = 1;\n}\nclass B {\n\tstatic y = 2;\n}',
			output: 'export default {\n\tx : 1,\n}\nconst B = {\n\ty : 2,\n};',
			errors: 2,
		},
	],
});

// `super` is caught as text, so a computed access and a nested class body are covered too. A `super` inside a nested class method is valid in an object literal, but the text check withholds the fix for it too.
test({
	valid: [],
	invalid: [
		{
			code: 'class A { static x = super["y"]; }',
			errors: 1,
		},
		// The guard is a text check, so a `super` that is valid in the object literal, inside a nested class method, also withholds the fix. That is safe, just less helpful.
		{
			code: 'class A { static x = class extends Y { m() { return super.y; } }; }',
			errors: 1,
		},
		// A reference to another binding with the same name is fine
		{
			code: 'class A { static x = (A) => A; }',
			output: 'const A = { x : (A) => A, };',
			errors: 1,
		},
	],
});
