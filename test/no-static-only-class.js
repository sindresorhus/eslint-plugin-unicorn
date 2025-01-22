import outdent from 'outdent';
import {getTester} from './utils/test.js';

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
		// Decorator
		'@decorator class A { static  a = 1; }',
		// TS class
		'class A { static public a = 1; }',
		'class A { static private a = 1; }',
		'class A { static readonly a = 1; }',
		'class A { static declare a = 1; }',
		outdent`
			class A {
				@decorator
				static a = 1;
			}
		`,
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

test.babel({
	testerOptions: {
		languageOptions: {
			parserOptions: {
				babelOptions: {
					parserOpts: {
						plugins: ['classStaticBlock'],
					},
				},
			},
		},
	},
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
	],
});
