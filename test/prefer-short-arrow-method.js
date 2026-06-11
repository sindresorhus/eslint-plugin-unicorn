import {parsers, getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const object = {foo: () => bar};',
		'const object = {foo: () => {return bar;}};',
		'const object = {foo: function () {return bar;}};',
		'const object = {foo() {}};',
		'const object = {foo() {return;}};',
		'const object = {foo() {const bar = 1; return bar;}};',
		'const object = {get foo() {return bar;}};',
		'const object = {set foo(value) {bar = value;}};',
		'const object = {* foo() {yield bar;}};',
		'const object = {foo() {return this.foo;}};',
		'const object = {foo() {return arguments;}};',
		'const object = {foo() {return super.foo;}};',
		'const object = {foo() {return new.target;}};',
		'const object = {foo() {return eval("this");}};',
		'const object = {foo() {return eval("arguments.length");}};',
		'const object = {foo() {return function () {return this.foo;};}};',
		'const object = {__proto__() {return foo;}};',
		'class Foo {foo() {return bar;}}',
		'class Foo {foo = () => bar;}',
	],
	invalid: [
		'const object = {foo() {return bar;}};',
		'const object = {async foo() {return bar;}};',
		'const object = {foo(bar) {return bar;}};',
		'const object = {foo(thisValue) {return thisValue;}};',
		'const object = {foo({bar}, baz = 1, ...rest) {return bar + baz + rest.length;}};',
		'const object = {foo() {return {};}};',
		'const object = {foo() {return (foo, bar);}};',
		'const object = {["foo"]() {return bar;}};',
		'const object = {["__proto__"]() {return bar;}};',
		'const object = {"foo"() {return bar;}};',
		'const object = {foo() {/* comment */ return bar;}};',
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'const object = {foo() {return this.foo;}};',
		'const object = {foo(this: Foo, bar: string): string {return bar;}};',
	],
	invalid: [
		'const object = {foo(bar: string): string {return bar;}};',
		'const object = {foo(): (bar: string) => string {return bar;}};',
		'const object = {foo(): Foo {return {} as Foo;}};',
		'const object = {foo(): Foo {return {} satisfies Foo;}};',
		'const object = {foo<T>(bar: T): T {return bar;}};',
	],
});
