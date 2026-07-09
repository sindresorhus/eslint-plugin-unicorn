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

test.snapshot({
	valid: [],
	invalid: [
		{
			code: 'const object = {alwaysMode() {return foo;}};',
			options: ['always'],
		},
	],
});

test.snapshot({
	valid: [
		{
			code: 'const object = {foo() {return foo;}, bar() {const bar = 1; return bar;}};',
			options: ['consistent-as-needed'],
		},
		{
			code: 'const object = {foo() {return foo;}, bar() {return;}};',
			options: ['consistent-as-needed'],
		},
		{
			code: 'const object = {foo() {return foo;}, bar() {return this.bar;}};',
			options: ['consistent-as-needed'],
		},
		{
			code: 'const object = {foo() {return foo;}, bar() {return eval("this");}};',
			options: ['consistent-as-needed'],
		},
		{
			code: 'const object = {foo() {return foo;}, * bar() {yield bar;}};',
			options: ['consistent-as-needed'],
		},
		{
			code: 'const object = {foo() {return foo;}, __proto__() {return bar;}};',
			options: ['consistent-as-needed'],
		},
		{
			code: 'const object = {foo() {return foo;}, bar() {/* comment */ return bar;}};',
			options: ['consistent-as-needed'],
		},
	],
	invalid: [
		{
			code: 'const object = {foo() {return foo;}};',
			options: ['consistent-as-needed'],
		},
		{
			code: 'const object = {foo() {return foo;}, bar() {return bar;}};',
			options: ['consistent-as-needed'],
		},
		{
			code: 'const object = {get baz() {return baz;}, foo() {return foo;}, bar: bar, qux: () => qux};',
			options: ['consistent-as-needed'],
		},
		{
			code: 'const object = {get bar() {return bar;}, foo() {return foo;}};',
			options: ['consistent-as-needed'],
		},
		{
			code: 'const object = {bar: bar, foo() {return foo;}};',
			options: ['consistent-as-needed'],
		},
		{
			code: 'const object = {bar: () => bar, foo() {return foo;}};',
			options: ['consistent-as-needed'],
		},
		{
			code: 'const object = {bar: function () {return bar;}, foo() {return foo;}};',
			options: ['consistent-as-needed'],
		},
		{
			code: 'const object = {...bar, foo() {return foo;}};',
			options: ['consistent-as-needed'],
		},
		{
			code: 'const object = {foo() {return foo;}, nested: {bar() {return this.bar;}}};',
			options: ['consistent-as-needed'],
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
		{
			code: 'const object = {foo() {return foo;}, bar<T>(bar: T): T {return bar;}};',
			options: ['consistent-as-needed'],
		},
	],
	invalid: [],
});
