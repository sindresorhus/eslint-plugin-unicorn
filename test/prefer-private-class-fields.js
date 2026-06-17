import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Already private
		'class Foo { #bar = 1; }',
		'class Foo { get #bar() {} }',

		// No underscore prefix
		'class Foo { bar = 1; }',

		// Computed key
		'class Foo { [_bar] = 1; }',
		'class Foo { ["_bar"] = 1; }',

		// Real constructor
		'class Foo { constructor() {} }',

		// Invalid private name after stripping the underscore
		'class Foo { _ = 1; }',
		'class Foo { _1foo = 1; }',
		'class Foo { _constructor() {} }',

		// Collision with an existing private member
		'class Foo { #bar = 1; _bar = 2; }',
		'class Foo { #bar() {} _bar = 1; }',
		'class Foo { get #bar() {} _bar = 1; }',

	],
	invalid: [
		// Lone field
		'class Foo { _bar = 1; }',

		// Lone static field (no \`this\` access, still safe to fix)
		'class Foo { static _bar = 1; }',

		// Method
		outdent`
			class Foo {
				_bar() {
					return 1;
				}

				baz() {
					return this._bar();
				}
			}
		`,

		// Field read through \`this\`
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return this._bar;
				}
			}
		`,

		// Optional chaining on \`this\`
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return this?._bar;
				}
			}
		`,

		// Reference inside an arrow callback keeps \`this\`
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return [1].map(() => this._bar);
				}
			}
		`,

		// Lone getter (no setter)
		outdent`
			class Foo {
				#value = 1;
				get _bar() {
					return this.#value;
				}

				baz() {
					return this._bar;
				}
			}
		`,

		// Getter/setter pair (both renamed, references renamed once)
		outdent`
			class Foo {
				#value = 1;
				get _bar() {
					return this.#value;
				}

				set _bar(value) {
					this.#value = value;
				}

				baz() {
					return this._bar;
				}
			}
		`,

		// Static field accessed through \`this\` in a static method
		outdent`
			class Foo {
				static _bar = 1;
				static baz() {
					return this._bar;
				}
			}
		`,

		// Multiple distinct underscore members
		outdent`
			class Foo {
				_foo = 1;
				_bar() {}
				baz() {
					return this._foo + this._bar();
				}
			}
		`,

		// Mixed: \`_foo\` is fixable, \`_bar\` is report-only (computed access blocks only \`_bar\`)
		outdent`
			class Foo {
				_foo = 1;
				_bar = 2;
				baz() {
					return this._foo + this["_bar"];
				}
			}
		`,

		// Comment inside the class is preserved
		outdent`
			class Foo {
				// The answer.
				_bar = 42;
				baz() {
					return this._bar;
				}
			}
		`,

		// Two unrelated classes with the same underscore name (each only uses its own \`this\`)
		outdent`
			class Foo {
				_bar = 1;
				a() {
					return this._bar;
				}
			}

			class Baz {
				_bar = 2;
				b() {
					return this._bar;
				}
			}
		`,

		// Report-only (no autofix): external same-file access
		outdent`
			class Foo {
				_bar = 1;
			}

			const foo = new Foo();
			console.log(foo._bar);
		`,

		// Report-only: computed access
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return this["_bar"];
				}
			}
		`,

		// Report-only: object spread observes public fields
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return {...this};
				}
			}
		`,

		// Report-only: object rest observes public fields
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					const {...rest} = this;
					return rest;
				}
			}
		`,

		// Report-only: object rest assignment observes public fields
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					let rest;
					({...rest} = this);
					return rest;
				}
			}
		`,

		// Report-only: Object static methods observe public fields
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return Object.keys(this);
				}
			}
		`,

		// Report-only: computed Object static methods observe public fields
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return Object['keys'](this);
				}
			}
		`,

		// Report-only: Object.assign observes public fields
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return Object.assign({}, this);
				}
			}
		`,

		// Report-only: JSON.stringify observes public fields
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return JSON.stringify(this);
				}
			}
		`,

		// Report-only: computed JSON.stringify observes public fields
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return JSON['stringify'](this);
				}
			}
		`,

		// Best-effort boundary: \`Reflect.ownKeys\` observation is not detected, so this is knowingly autofixed
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return Reflect.ownKeys(this);
				}
			}
		`,

		// Best-effort boundary: the \`in\` operator is not detected, so this is knowingly autofixed
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return '_bar' in this;
				}
			}
		`,

		// Best-effort boundary: \`for...in\` is not detected, so this is knowingly autofixed
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					for (const key in this) {
						return key;
					}
				}
			}
		`,

		// Report-only: static object spread observes public fields
		outdent`
			class Foo {
				static _bar = 1;
				static baz() {
					return {...this};
				}
			}
		`,

		// Report-only: static object rest observes public fields
		outdent`
			class Foo {
				static _bar = 1;
				static baz() {
					const {...rest} = this;
					return rest;
				}
			}
		`,

		// Report-only: static Object static methods observe public fields
		outdent`
			class Foo {
				static _bar = 1;
				static baz() {
					return Object.keys(this);
				}
			}
		`,

		// Best-effort boundary: observing a static member through the class name is not detected, so this is knowingly autofixed
		outdent`
			class Foo {
				static _bar = 1;
				static baz() {
					return Object.keys(Foo);
				}
			}
		`,

		// Report-only: unknown computed access
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return this['_' + 'bar'];
				}
			}
		`,

		// Report-only: destructuring \`this\`
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					const {_bar} = this;
					return _bar;
				}
			}
		`,

		// Report-only: \`super\` access in a subclass
		outdent`
			class Base {
				_bar = 1;
			}

			class Sub extends Base {
				baz() {
					return super._bar;
				}
			}
		`,

		// Report-only: \`this\` rebound by a nested non-arrow function
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return [1].forEach(function () {
						return this._bar;
					});
				}
			}
		`,

		// Report-only: static field accessed through the class name
		outdent`
			class Foo {
				static _bar = 1;
				static baz() {
					return Foo._bar;
				}
			}
		`,

		// Report-only: subclass accesses inherited member via \`this\`
		outdent`
			class Base {
				_foo = 1;
			}

			class Sub extends Base {
				baz() {
					return this._foo;
				}
			}
		`,

		// Double underscore: __bar becomes #_bar
		outdent`
			class Foo {
				__bar = 1;
				baz() {
					return this.__bar;
				}
			}
		`,

		// Class expression
		'const Foo = class { _bar = 1; };',

		// Arrow function in field initializer
		outdent`
			class Foo {
				_bar = 1;
				_handler = () => this._bar;
			}
		`,

		// Field initializer referencing another underscore field
		outdent`
			class Foo {
				_foo = 1;
				_bar = this._foo + 1;
			}
		`,

		// Report-only: field initializer referencing a later underscore field
		outdent`
			class Foo {
				_bar = this._foo;
				_foo = 1;
			}
		`,

		// Report-only: field initializer referencing itself
		outdent`
			class Foo {
				_foo = this._foo ?? 1;
			}
		`,

		// Report-only: computed class element key
		outdent`
			class Foo {
				_foo = 1;
				[this._foo]() {}
			}
		`,

		// Static block
		outdent`
			class Foo {
				static _bar = 1;
				static {
					this._bar = 2;
				}
			}
		`,

		// Object literal with underscore key does not block autofix
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return {_bar: this._bar};
				}
			}
		`,

		// Computed access on an unrelated object does not block autofix
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return this._bar;
				}
			}

			const array = [1, 2, 3];
			const first = array[0];
			const value = array[first];
		`,

		// Computed destructuring of an unrelated object does not block autofix
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return this._bar;
				}
			}

			const key = 'x';
			const {[key]: value} = globalThis;
		`,

		// \`this._foo\` inside a setter body
		outdent`
			class Foo {
				_foo = 0;
				set bar(value) {
					this._foo = value;
				}
			}
		`,

		// Nested classes: outer and inner are independent
		outdent`
			class Outer {
				_foo = 1;
				baz() {
					return this._foo;
				}

				inner = class {
					_foo = 2;
					qux() {
						return this._foo;
					}
				};
			}
		`,

		// Report-only: nested class computed key uses outer `this`
		outdent`
			class Outer {
				_foo = 'x';
				make() {
					return class Inner {
						_foo = 1;
						[this._foo]() {}
					};
				}
			}
		`,

		// Report-only: \`super._foo\` in the same class
		outdent`
			class Foo {
				_foo = 1;
				baz() {
					return super._foo;
				}
			}
		`,

		// Report-only: \`delete this._bar\` (private fields cannot be deleted)
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					delete this._bar;
				}
			}
		`,

		// Report-only: \`delete this?._bar\` (private fields cannot be deleted)
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					delete this?._bar;
				}
			}
		`,

		// Report-only: duplicate public members (duplicate #private is a syntax error)
		outdent`
			class Foo {
				_bar = 1;
				_bar = 2;
			}
		`,

		// Report-only: same class has computed duplicate public member
		outdent`
			class Foo {
				_bar = 1;
				['_bar'] = 2;
				baz() {
					return this._bar;
				}
			}
		`,

		// Report-only: same class has unknown computed duplicate public member
		outdent`
			class Foo {
				_bar = 1;
				['_' + 'bar'] = 2;
				baz() {
					return this._bar;
				}
			}
		`,

		// Report-only: duplicate getters
		outdent`
			class Foo {
				get _bar() { return 1; }
				get _bar() { return 2; }
			}
		`,

		// Report-only: static field accessed via \`this\` in an instance method
		outdent`
			class Foo {
				static _bar = 1;
				baz() {
					return this._bar;
				}
			}
		`,

		// Report-only: instance field accessed via \`this\` in a static method
		outdent`
			class Foo {
				_bar = 1;
				static baz() {
					return this._bar;
				}
			}
		`,

		// Report-only: template literal computed access
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return this[\`_bar\`];
				}
			}
		`,

		// Report-only: instance field accessed in a static block
		outdent`
			class Foo {
				_bar = 1;
				static {
					this._bar = 2;
				}
			}
		`,

		// Report-only: computed destructuring key
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					const {['_bar']: value} = this;
					return value;
				}
			}
		`,

		// Report-only: unknown computed destructuring key
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					const {['_' + 'bar']: value} = this;
					return value;
				}
			}
		`,

		// Report-only: subclass overrides the same member (breaks polymorphism)
		outdent`
			class Base {
				_bar() {
					return 1;
				}

				baz() {
					return this._bar();
				}
			}

			class Sub extends Base {
				_bar() {
					return 2;
				}
			}
		`,

		// Report-only: base class has a member overridden in a subclass
		outdent`
			class Base {
				_foo = 1;
			}

			class Sub extends Base {
				_foo = 2;
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
		// Accessibility modifiers
		'class Foo { private _bar = 1; }',
		'class Foo { protected _bar = 1; }',
		'class Foo { public _bar = 1; }',

		// Other TypeScript modifiers
		'class Foo { declare _bar: number; }',
		'class Foo { readonly _bar = 1; }',
		'class Foo { override _bar() {} }',

		// Decorated
		'class Foo { @deco _bar = 1; }',

		// Abstract members are a different node type
		'abstract class Foo { abstract _bar(): void; }',

		// Parameter properties are not class body members
		'class Foo { constructor(public _bar: number) {} }',
		'class Foo { constructor(_bar: number) {} }',
	],
	invalid: [
		// Type annotation without an accessibility modifier
		outdent`
			class Foo {
				_bar: number = 1;
				baz() {
					return this._bar;
				}
			}
		`,

		// Type annotation without initializer
		'class Foo { _bar: string; }',

		// Abstract class with concrete underscore member
		'abstract class Foo { _bar = 1; }',

		// \`accessor\` keyword
		'class Foo { accessor _bar = 1; }',

		// Non-null assertion on \`this\`
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return this!._bar;
				}
			}
		`,

		// Type assertion on \`this\`
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return (this as Foo)._bar;
				}
			}
		`,

		// \`satisfies\` wrapper on \`this\`
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return (this satisfies Foo)._bar;
				}
			}
		`,

		// Report-only: decorator expression
		outdent`
			class Foo {
				_foo = 1;
				@decorator(this._foo)
				bar = 1;
			}
		`,

		// Report-only: delete with TypeScript non-null assertion
		outdent`
			class Foo {
				_foo = 1;
				baz() {
					delete this._foo!;
				}
			}
		`,

		// Report-only: delete with TypeScript type assertion
		outdent`
			class Foo {
				_foo = 1;
				baz() {
					delete (this._foo as unknown);
				}
			}
		`,

		// Report-only: delete with TypeScript instantiation expression
		outdent`
			class Foo {
				_foo = 1;
				baz() {
					delete this._foo<string>;
				}
			}
		`,

		// Report-only: subclass overrides with public TypeScript member
		outdent`
			class Base {
				_bar() {
					return 1;
				}

				baz() {
					return this._bar();
				}
			}

			class Sub extends Base {
				public _bar() {
					return 2;
				}
			}
		`,

		// Best-effort boundary: a class decorator observing static members is not detected, so this is knowingly autofixed
		outdent`
			@decorator
			class Foo {
				static _bar = 1;
			}
		`,

		// Report-only: object spread observes public fields through a TypeScript assertion
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return {...(this as Foo)};
				}
			}
		`,

		// Report-only: object spread observes public fields through a \`satisfies\` wrapper
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					return {...(this satisfies Foo)};
				}
			}
		`,

		// Report-only: object rest observes public fields through a TypeScript assertion
		outdent`
			class Foo {
				_bar = 1;
				baz() {
					const {...rest} = this as Foo;
					return rest;
				}
			}
		`,
	],
});
