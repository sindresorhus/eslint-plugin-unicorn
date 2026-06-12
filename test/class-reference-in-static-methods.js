import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'class A {static foo() {return this.foo();}}',
		'class A extends B {static foo() {return super.foo();}}',
		'class A {foo() {return A.foo();}}',
		'class A extends B {foo() {return B.foo();}}',
		'class A {static foo = A.foo;}',
		'class A {static {A.foo();}}',
		'class A {static foo() {return function () {return A.foo();};}}',
		'class A extends B {static foo() {return function () {return B.foo();};}}',
		'class A {static foo() {const A = other; return A.foo();}}',
		'class A extends B {static foo() {const B = other; return B.foo();}}',
		'class A extends mixin(B) {static foo() {return B.foo();}}',
		'class A {static foo() {A();}}',
		'class A {static foo() {new A();}}',
		'class A {static foo() {A`foo`;}}',
		'class A {static foo() {A.foo = 1;}}',
		'class A {static foo() {A.foo.bar = 1;}}',
		'class A {static foo() {({foo: A.foo} = object);}}',
		'class A {static foo() {({foo: A.foo = fallback} = object);}}',
		'class A {static foo() {({...A.foo} = object);}}',
		'class A {static foo() {([A.foo] = values);}}',
		'class A {static foo() {A.foo++;}}',
		'class A {static foo() {A.foo.bar++;}}',
		'class A {static foo() {delete A.foo;}}',
		'class A {static foo() {delete A?.foo;}}',
		'class A {static foo() {delete A.foo.bar;}}',
		'class A {static foo() {for (A.foo in object) {}}}',
		'class A {static foo() {for (A.foo of values) {}}}',
		'class A extends B {static foo() {B();}}',
		'class A extends B {static foo() {B.foo = 1;}}',
		'class A extends B {static foo() {B.foo.bar = 1;}}',
		'class A extends B {static foo() {({foo: B.foo} = object);}}',
		'class A extends B {static foo() {({foo: B.foo.bar} = object);}}',
		'class A extends B {static foo() {({...B.foo} = object);}}',
		'class A extends B {static foo() {([B.foo] = values);}}',
		'class A extends B {static foo() {B.foo++;}}',
		'class A extends B {static foo() {B.foo.bar++;}}',
		'class A extends B {static foo() {delete B.foo;}}',
		'class A extends B {static foo() {delete B.foo.bar;}}',
		'class A extends B {static foo() {for (B.foo in object) {}}}',
		'class A extends B {static foo() {for (B.foo of values) {}}}',
		'class A extends B {static foo() {new B();}}',
		'class A extends B {static foo() {B`foo`;}}',
		'class A extends B {static foo() {return (B).foo();}}',
		'class A extends B {static foo() {return (B)["foo"]();}}',
		'class A extends B {static foo() {return {B};}}',
		'class A {static #foo; static foo() {return A.#foo;}}',
		'class A {static #foo; static foo() {return #foo in A;}}',
		'class A extends B {static #foo; static foo() {return B.#foo;}}',
		'class A extends B {}',
	],
	invalid: [
		'class A {static foo() {return A.foo();}}',
		'class A {static foo() {return A;}}',
		'class A extends B {static foo() {return B.foo();}}',
		'class A extends B {static foo() {return B["foo"]();}}',
		'class A extends B {static foo() {return () => B.foo();}}',
		outdent`
			const A = class {
				static foo() {
					return A.foo();
				}
			};
		`,
		outdent`
			const A = class B {
				static foo() {
					return B.foo();
				}
			};
		`,
	],
});

test.snapshot({
	valid: [
		{
			code: 'class A {static foo() {return A.foo();}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A extends B {static foo() {return B.foo();}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {foo() {return this.foo();}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A extends B {foo() {return super.foo();}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo = this.foo;}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {this();}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {new this();}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {this`foo`;}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {this.foo = 1;}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {this.foo.bar = 1;}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {({foo: this.foo} = object);}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {([this.foo] = values);}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {({...this.foo} = object);}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {delete this?.foo;}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static #foo; static foo() {return this.#foo;}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static #foo; static foo() {return #foo in this;}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {for (this.foo in object) {}}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {for (this.foo of values) {}}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A extends B {static {super.foo();}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A extends B {static foo() {super.foo = 1;}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A extends B {static foo() {super.foo.bar = 1;}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A extends B {static foo() {({foo: super.foo} = object);}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A extends B {static foo() {([super.foo] = values);}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A extends B {static foo() {({...super.foo} = object);}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A extends B {static foo() {for (super.foo in object) {}}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A extends B {static foo() {for (super.foo of values) {}}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {return function () {return this.foo();};}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A extends B {static foo() {return function () {return this.foo();};}}',
			options: [{preferThis: false, preferSuper: false}],
		},
	],
	invalid: [
		{
			code: 'class A {static foo() {return this.foo();}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {return this;}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A extends B {static foo() {return super.foo();}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A extends B {static foo() {return () => super.foo();}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'const A = class {static foo() {return this.foo();}};',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'export default class {static foo() {return this.foo();}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A extends mixin(B) {static foo() {return super.foo();}}',
			options: [{preferThis: false, preferSuper: false}],
		},
	],
});

test.snapshot({
	valid: [
		{
			code: 'class A extends B {static foo() {return A.foo() + super.foo();}}',
			options: [{preferThis: false}],
		},
		{
			code: 'class A extends B {static foo() {return this.foo() + B.foo();}}',
			options: [{preferSuper: false}],
		},
	],
	invalid: [
		{
			code: 'class A extends B {static foo() {return this.foo() + B.foo();}}',
			options: [{preferThis: false}],
		},
		{
			code: 'class A extends B {static foo() {return A.foo() + super.foo();}}',
			options: [{preferSuper: false}],
		},
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'class A {static foo(): unknown {return this.foo();}}',
		'class A extends B {static foo(): unknown {return super.foo();}}',
		'class A {static foo(): A {return this.foo();}}',
		'class A {static foo() {const value: A = this.foo(); return value;}}',
		'class A {static foo() {return identity<A>(this.foo());}}',
		'class A {static foo() {const value: typeof A = this.foo(); return value;}}',
		'class A {static foo() {(A as typeof A)();}}',
		'class A {static foo() {new (A as typeof A)();}}',
		'class A {static foo() {(A as typeof A)`foo`;}}',
		'class A {static foo() {(<typeof A>A)();}}',
		'class A {static foo() {A!();}}',
		'class A {static foo() {(A satisfies typeof A)();}}',
		'class A {static foo() {(A as typeof A).foo = 1;}}',
		'class A {static foo() {(<typeof A>A).foo = 1;}}',
		'class A {static foo() {A!.foo = 1;}}',
		'class A {static foo() {(A satisfies typeof A).foo = 1;}}',
		'class A {static #foo; static foo() {return (A as typeof A).#foo;}}',
		'class A {static #foo; static foo() {return A!.#foo;}}',
		'class A {static #foo; static foo() {return #foo in (A as typeof A);}}',
		'class A {static #foo; static foo() {return #foo in A!;}}',
		'class A extends B {static foo() {(B as typeof B).foo = 1;}}',
		{
			code: 'class A {static foo() {(this as typeof A).foo = 1;}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {this!.foo = 1;}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static #foo; static foo() {return (this as typeof A).#foo;}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static #foo; static foo() {return this!.#foo;}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static #foo; static foo() {return #foo in (this as typeof A);}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static #foo; static foo() {return #foo in this!;}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {(this as typeof A)();}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {new (this as typeof A)();}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {(this as typeof A)`foo`;}}',
			options: [{preferThis: false, preferSuper: false}],
		},
		{
			code: 'class A {static foo() {this!();}}',
			options: [{preferThis: false, preferSuper: false}],
		},
	],
	invalid: [
		'class A {static foo(): unknown {return A.foo();}}',
		'class A {static foo(): A {return A.foo();}}',
		'class A extends B {static foo(): unknown {return B.foo();}}',
	],
});
