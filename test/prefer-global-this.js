import {getTester} from './utils/test.js';
import outdent from 'outdent';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'globalThis',
		'globalThis.foo',
		'globalThis[foo]',
		'globalThis.foo()',
		'const { foo } = globalThis',
		'function foo (window) {}',
		'function foo (global) {}',
		'var foo = function foo (window) {}',
		'var foo = function foo (global) {}',
		'var window = {}',
		'let global = {}',
		'const global = {}',
		outdent`
			function foo (window) {
				window.foo();
			}
		`,
		outdent`
			var window = {};
			function foo () {
				window.foo();
			}
		`,
		'foo.window',
		'foo.global',
		'import window from "xxx"',
		'import * as window from "xxx"',
		'import window, {foo} from "xxx"',
		'export { window }  from "xxx"',
		'export * as window from "xxx";',
		outdent`
			try {

			} catch (window) {}
		`,

		// Use window specific APIs
		'window.name = "foo"',
		'window.addEventListener',
		'window.innerWidth',
		'window.innerHeight',
		'self.location',
		'self.navigator',
		'window.addEventListener("resize", () => {})',
		'window.onresize = function () {}',
		outdent`
			const {window} = jsdom()
			window.jQuery = jQuery;
		`,
		'({ foo: window.name } =  {})',
		'[window.name] = []',
		'window[foo]',
		'window[title]',
		'window["foo"]',
	],
	invalid: [
		'global',
		'self',
		'window',
		'window.foo',
		'window.foo()',
		'window > 10',
		'10 > window',
		'window ?? 10',
		'10 ?? window',
		'window.foo = 123',
		'window = 123',
		'obj.a = window',
		outdent`
			function* gen() {
			  yield window
			}
		`,
		outdent`
			async function gen() {
			  await window
			}
		`,
		'window ? foo : bar',
		'foo ? window : bar',
		'foo ? bar : window',
		outdent`
			function foo() {
			  return window
			}
		`,
		'new window()',
		outdent`
			const obj = {
				foo: window.foo,
				bar: window.bar,
				window: window
			}
		`,
		outdent`
			function sequenceTest() {
				let x, y;
				x = (y = 10, y + 5, window);
				console.log(x, y);
			}
		`,
		'window`Hello ${42} World`', // eslint-disable-line no-template-curly-in-string
		'tag`Hello ${window.foo} World`', // eslint-disable-line no-template-curly-in-string
		'var str = `hello ${window.foo} world!`', // eslint-disable-line no-template-curly-in-string
		'delete window.foo',
		'++window',
		'++window.foo',
		outdent`
			for (var attr in window) {

			}
		`,
		outdent`
			for (window.foo = 0; i < 10; window.foo++) {

			}
		`,
		outdent`
			for (const item of window.foo) {
			}
		`,
		outdent`
			for (const item of window) {
			}
		`,
		outdent`
			switch (window) {}
		`,
		outdent`
			switch (true) {
				case window:
					break;
			}
		`,
		outdent`
			switch (true) {
				case window.foo:
					break;
			}
		`,
		outdent`
			while (window) {
			}
		`,
		'do {} while (window) {}',
		'if (window) {}',
		'throw window',
		'var foo = window',
		outdent`
			function foo (name = window) {

			}
		`,
		'self.innerWidth',
		'self.innerHeight',
		'window.crypto',
		'window.addEventListener("play", () => {})',
		'window.onplay = function () {}',
		'function greet({ name = window.foo }) {}',
		'({ foo: window.foo } =  {})',
		'[window.foo] = []',
		'foo[window]',
		'foo[window.foo]',
		'typeof window !== "undefined"',
		'typeof self !== "undefined"',
		'typeof global !== "undefined"',
		'typeof window.something === "function"',
		'typeof self.something === "function"',
		'typeof global.something === "function"',
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			globals: {global: 'off', window: 'off', self: 'off'},
		},
	},
	valid: [],
	invalid: [
		'global.global_did_not_declare_in_language_options',
		'window.window_did_not_declare_in_language_options',
		'self.self_did_not_declare_in_language_options',
	],
});
