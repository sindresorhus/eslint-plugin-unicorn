import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		// No superclass.
		'class Foo { foo() { return super.foo(); } }',
		// Different method name.
		'class Foo extends Bar { foo(a) { return super.bar(a); } }',
		// Constructor is handled by `no-useless-constructor`.
		'class Foo extends Bar { constructor(a) { super(a); } }',
		// Getters and setters (paired-accessor shadowing makes removal unsafe).
		'class Foo extends Bar { get foo() { return super.foo; } }',
		'class Foo extends Bar { set foo(value) { super.foo = value; } }',
		// Adds logic.
		'class Foo extends Bar { foo(a) { log(); return super.foo(a); } }',
		'class Foo extends Bar { foo(a) { return super.foo(a) + 1; } }',
		'class Foo extends Bar { foo(a) { this.x = a; return super.foo(a); } }',
		// Transformed, extra, or missing arguments.
		'class Foo extends Bar { foo(a) { return super.foo(a + 1); } }',
		'class Foo extends Bar { foo(a) { return super.foo(); } }',
		'class Foo extends Bar { foo(a) { return super.foo(a, 1); } }',
		'class Foo extends Bar { foo(a, b) { return super.foo(b, a); } }',
		'class Foo extends Bar { foo(...args) { return super.foo(...args, 1); } }',
		'class Foo extends Bar { foo(a) { return super.foo(b); } }',
		// Default and destructured parameters.
		'class Foo extends Bar { foo(a = 1) { return super.foo(a); } }',
		'class Foo extends Bar { foo({a}) { return super.foo({a}); } }',
		'class Foo extends Bar { foo([a]) { return super.foo([a]); } }',
		// Legacy `arguments` forwarding (only equivalent with no named params).
		'class Foo extends Bar { foo() { return super.foo(...arguments); } }',
		// Optional chaining changes semantics.
		'class Foo extends Bar { foo(a) { return super.foo?.(a); } }',
		// `super` used in a nested function rebinds nothing useful here; not a direct passthrough.
		'class Foo extends Bar { foo(a) { return () => super.foo(a); } }',
		// Dynamic computed name cannot be matched.
		'class Foo extends Bar { [key](a) { return super[key](a); } }',
		// A rest parameter forwarded as an array, not spread, changes what the parent receives.
		'class Foo extends Bar { foo(...args) { return super.foo(args); } }',
		// Spreading a non-rest parameter is not plain forwarding.
		'class Foo extends Bar { foo(a) { return super.foo(...a); } }',
		// The call target is `super.foo.call`, not `super.foo`.
		'class Foo extends Bar { foo(a) { return super.foo.call(this, a); } }',
		// Class fields are own properties, not prototype methods, so the rule ignores them.
		'class Foo extends Bar { foo = (a) => super.foo(a); }',
		// Async without type information is skipped (parent might be sync).
		'class Foo extends Bar { async foo(a) { return super.foo(a); } }',
		// Statement-form passthrough without type information is skipped (parent return value is unknown).
		'class Foo extends Bar { foo(a) { super.foo(a); } }',
		// Generators are not supported.
		'class Foo extends Bar { * foo(a) { yield* super.foo(a); } }',
		// Empty body.
		'class Foo extends Bar { foo() {} }',
		// A lone empty statement is not a super-forwarding body.
		'class Foo extends Bar { foo() { ; } }',
		// `void` wraps the call in a `UnaryExpression`, so it is not a plain passthrough.
		'class Foo extends Bar { foo(a) { return void super.foo(a); } }',
		// A sequence expression is not a plain super call.
		'class Foo extends Bar { foo(a) { (super.foo(a), 0); } }',
		// The rest parameter is spread under a different name.
		'class Foo extends Bar { foo(...args) { return super.foo(...other); } }',
		// A `'use strict'` directive makes the body two statements.
		'class Foo extends Bar { foo(a) { "use strict"; return super.foo(a); } }',
		// A tagged template is not a call expression.
		'class Foo extends Bar { foo(a) { return super.foo`x`; } }',
		// `new super.foo(a)` constructs rather than forwards.
		'class Foo extends Bar { foo(a) { return new super.foo(a); } }',
	],
	invalid: [
		'class Foo extends Bar { foo() { return super.foo(); } }',
		'class Foo extends Bar { foo(a, b) { return super.foo(a, b); } }',
		'class Foo extends Bar { foo(...args) { return super.foo(...args); } }',
		'class Foo extends Bar { foo(a, ...rest) { return super.foo(a, ...rest); } }',
		'class Foo extends Bar { static foo(a) { return super.foo(a); } }',
		// Computed but statically-known matching name.
		'class Foo extends Bar { ["foo"](a) { return super["foo"](a); } }',
		// Mixed dot and computed access resolve to the same name.
		'class Foo extends Bar { foo(a) { return super["foo"](a); } }',
		// A well-known symbol key is matched.
		'class Foo extends Bar { [Symbol.iterator]() { return super[Symbol.iterator](); } }',
		// A computed `"constructor"` key is a normal method, not the real constructor.
		'class Foo extends Bar { ["constructor"](a) { return super["constructor"](a); } }',
		// A trailing comma adds no argument node.
		'class Foo extends Bar { foo(a) { return super.foo(a,); } }',
		// A parenthesized callee still resolves to the same method.
		'class Foo extends Bar { foo(a) { return (super.foo)(a); } }',
		// A template-literal computed key resolves to a static name.
		'class Foo extends Bar { [`foo`](a) { return super[`foo`](a); } }',
		// Parentheses around the super call do not affect matching.
		'class Foo extends Bar { foo(a) { return (super.foo(a)); } }',
		// Class expression.
		'const Foo = class extends Bar { foo(a) { return super.foo(a); } };',
		// Exported.
		'export class Foo extends Bar { foo(a) { return super.foo(a); } }',
		'export default class Foo extends Bar { foo(a) { return super.foo(a); } }',
		// Multiple methods, only the useless one is removed.
		outdent`
			class Foo extends Bar {
				foo(a) {
					return super.foo(a);
				}

				bar(a) {
					log();
					return super.bar(a);
				}
			}
		`,
		// Comments inside are preserved (reported, but not auto-fixed).
		outdent`
			class Foo extends Bar {
				foo(a) {
					// Keep me.
					return super.foo(a);
				}
			}
		`,
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		// Accessibility modifiers change the API surface.
		'class Foo extends Bar { public foo(a) { return super.foo(a); } }',
		'class Foo extends Bar { protected foo(a) { return super.foo(a); } }',
		'class Foo extends Bar { private foo(a) { return super.foo(a); } }',
		// Decorators change behavior.
		'class Foo extends Bar { @decorator foo(a) { return super.foo(a); } }',
		// A parameter decorator registers metadata when the method is defined.
		'class Foo extends Bar { foo(@decorator a) { return super.foo(a); } }',
		// Abstract methods have no body.
		'abstract class Foo extends Bar { abstract foo(a): void; }',
		// Type-cast and non-null assertions on arguments signal intent.
		'class Foo extends Bar { foo(a) { return super.foo(a as any); } }',
		'class Foo extends Bar { foo(a) { return super.foo(a!); } }',
		'class Foo extends Bar { foo(a) { return super.foo(a satisfies number); } }',
		// An old-style type cast wraps the call, so it is not a plain passthrough.
		'class Foo extends Bar { foo(a) { return <number>super.foo(a); } }',
		// A leading `this` parameter changes the param/argument count (documented limitation).
		'class Foo extends Bar { foo(this: Foo, a) { return super.foo(a); } }',
		// Optional methods are skipped.
		'class Foo extends Bar { foo?(a) { return super.foo(a); } }',
		// A non-null assertion on the result is not a plain passthrough.
		'class Foo extends Bar { foo(a) { return super.foo(a)!; } }',
		// Removing the implementation would orphan its overload signatures.
		outdent`
			class Foo extends Bar {
				foo(a: string): void;
				foo(a: number): void;
				foo(a) { return super.foo(a); }
			}
		`,
	],
	invalid: [
		// The `override` keyword is still a runtime-redundant passthrough.
		'class Foo extends Bar { override foo(a) { return super.foo(a); } }',
		'class Foo extends Bar { override foo(...args) { return super.foo(...args); } }',
	],
});

// With type information, `async` passthroughs are reported only when the parent already returns a promise.
test.snapshot({
	valid: [
		// Parent is synchronous, so the `async` wrapper changes the return type.
		typeAware('class Base { foo(a: number) { return a; } } class Foo extends Base { async foo(a: number) { return super.foo(a); } }'),
		// Statement-form passthrough whose parent returns a value (removal would expose that value).
		typeAware('class Base { foo(a: number) { return a; } } class Foo extends Base { foo(a: number) { super.foo(a); } }'),
		// An `async` statement-form passthrough returns a promise, even when the parent returns nothing.
		typeAware('class Base { foo(a: number) {} } class Foo extends Base { async foo(a: number) { super.foo(a); } }'),
		// `return await super.foo()` is not a plain `return super.foo()`, so it is left alone.
		typeAware('class Base { async foo() { return 1; } } class Foo extends Base { async foo() { return await super.foo(); } }'),
	],
	invalid: [
		// Parent is `async`, so the override adds nothing.
		typeAware('class Base { async foo(a: number) { return a; } } class Foo extends Base { async foo(a: number) { return super.foo(a); } }'),
		// Parent returns a promise without `async`.
		typeAware('class Base { foo(a: number): Promise<number> { return Promise.resolve(a); } } class Foo extends Base { async foo(a: number) { return super.foo(a); } }'),
		// A synchronous passthrough is reported regardless of type information.
		typeAware('class Base { foo(a: number) { return a; } } class Foo extends Base { foo(a: number) { return super.foo(a); } }'),
		// Statement-form passthrough whose parent returns nothing.
		typeAware('class Base { foo(a: number) {} } class Foo extends Base { foo(a: number) { super.foo(a); } }'),
	],
});
