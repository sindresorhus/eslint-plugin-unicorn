import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'function foo(a, b) {}\nfoo(1, 2);',
		'function foo(a, b = 1) {}\nfoo(1);',
		'function foo(a, {b} = {}) {}\nfoo(1);',
		'function foo(a = 1, b = 2) {}\nfoo();',
		'function foo(a, ...rest) {}\nfoo(1, 2, 3);',
		'const foo = function (a, b) {};\nfoo(1, 2);',
		'const foo = (a, b) => {};\nfoo(1, 2);',
		'(function (a, b) {})(1, 2);',
		'((a, b) => {})(1, 2);',

		// Calls with spread arguments are ignored.
		'function foo(a, b) {}\nfoo(1, ...rest);',
		'function foo(a, b) {}\nfoo(...rest);',

		// Unsupported targets.
		'foo(1);',
		'foo.bar(1);',
		'new foo(1);',
		'foo.call(undefined, 1);',
		'foo.apply(undefined, [1]);',
		'foo.bind(undefined, 1);',
		'function foo(a, b) {}\nfoo.call(undefined, 1);',
		'function foo(a, b) {}\nfoo.apply(undefined, [1]);',
		'function foo(a, b) {}\nfoo.bind(undefined, 1);',
		'import foo from "foo";\nfoo(1);',
		'let foo = (a, b) => {};\nfoo(1);',
		'var foo = function (a, b) {};\nfoo(1);',
		'function foo(a, b) {}\nfoo = value => value;\nfoo(1);',
		outdent`
			const foo = condition
				? (a, b) => {}
				: (a) => {};
			foo(1);
		`,

		// Non-trailing defaults are still required by argument position.
		'function foo(a = 1, b) {}\nfoo(undefined, 2);',

		// TypeScript overloads are ignored.
		{
			code: outdent`
				function foo(value: string): void;
				function foo(value: string, options: object): void;
				function foo(value: string, options?: object) {}
				foo();
				foo('value');
				foo('value', {});
				foo('value', {}, 'extra');
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'declare function foo(value: string, options: object): void;\nfoo("value");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(value: string, options?: object) {}\nfoo("value");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(this: void, value: string) {}\nfoo("value");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const foo = function (this: void, value: string) {};\nfoo("value");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(first: string, second: string) {}\n(foo as typeof foo)("first", "second");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo<T>(first: T, second: T) {}\n(foo<string>)("first", "second");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const foo = ((first: string, second: string) => {}) as (first: string, second: string) => void;\nfoo("first", "second");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'import foo from "foo";\n(foo as (first: string, second: string) => void)("first");',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'function foo(a, b) {}\nfoo(1);',
		'foo(1);\nfunction foo(a, b) {}',
		'function foo(a, b) {}\nfoo(1, 2, 3);',
		'function foo() {}\nfoo(1);',
		'function foo(a, b = 1) {}\nfoo();',
		'function foo(a, b = 1) {}\nfoo(1, 2, 3);',
		'function foo(a = 1, b) {}\nfoo(2);',
		'function foo(a, ...rest) {}\nfoo();',
		'const foo = function (a, b) {};\nfoo(1);',
		'const foo = (a, b) => {};\nfoo(1, 2, 3);',
		'const foo = (a, b) => {};\nfoo?.(1);',
		'(function (a, b) {})(1);',
		'((a, b) => {})(1, 2, 3);',
		'(function (a, b) {})?.(1);',
		'((a, b) => {})?.(1, 2, 3);',
		outdent`
			function foo() {
				console.log(arguments);
			}

			foo(1);
		`,
		{
			code: 'function foo(value: string, options?: object) {}\nfoo();',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(value: string, options?: object) {}\nfoo("value", {}, "extra");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(this: void, value: string) {}\nfoo();',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(this: void, value: string) {}\nfoo("value", "extra");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(first: string, second: string) {}\n(foo as typeof foo)("first");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(first: string, second: string) {}\n(<typeof foo>foo)("first");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(first: string, second: string) {}\nfoo!("first");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(first: string, second: string) {}\n(foo satisfies typeof foo)("first");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo<T>(first: T, second: T) {}\n(foo<string>)("first");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const foo = ((first: string, second: string) => {}) as (first: string, second: string) => void;\nfoo("first");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(function (first: string, second: string) {} as (first: string, second: string) => void)("first");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(((first: string, second: string) => {}) satisfies (first: string, second: string) => void)("first");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '((<T>(first: T, second: T) => {})<string>)("first");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const foo = ((first: string, second: string) => {}) satisfies (first: string, second: string) => void;\nfoo("first");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const foo = ((first: string, second: string) => {})!;\nfoo("first");',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
