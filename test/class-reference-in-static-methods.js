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
		'class A {static foo() {A.foo = 1;}}',
		'class A {static foo() {A.foo++;}}',
		'class A {static foo() {delete A.foo;}}',
		'class A extends B {static foo() {B.foo = 1;}}',
		'class A extends B {static foo() {B.foo++;}}',
		'class A extends B {static foo() {delete B.foo;}}',
		'class A extends B {static foo() {new B();}}',
		'class A extends B {static foo() {return {B};}}',
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
			code: 'class A {static foo() {this.foo = 1;}}',
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
	],
	invalid: [
		'class A {static foo(): unknown {return A.foo();}}',
		'class A {static foo(): A {return A.foo();}}',
		'class A extends B {static foo(): unknown {return B.foo();}}',
	],
});
