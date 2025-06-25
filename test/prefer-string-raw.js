/* eslint-disable no-template-curly-in-string */
import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		String.raw`a = '\''`,
		// Cannot use `String.raw`
		String.raw`'a\\b'`,
		String.raw`import foo from "./foo\\bar.js";`,
		String.raw`export {foo} from "./foo\\bar.js";`,
		String.raw`export * from "./foo\\bar.js";`,
		String.raw`a = {'a\\b': ''}`,
		outdent`
			a = "\\\\a \\
				b"
		`,
		String.raw`a = 'a\\b\u{51}c'`,
		'a = "a\\\\b`"',
		'a = "a\\\\b${foo}"',
		{
			code: String.raw`<Component attribute="a\\b" />`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		String.raw`import {} from "foo" with {key: "value\\value"}`,
		String.raw`import {} from "foo" with {"key\\key": "value"}`,
		String.raw`export {} from "foo" with {key: "value\\value"}`,
		String.raw`export {} from "foo" with {"key\\key": "value"}`,
		String.raw`a = '\\'`,
		String.raw`a = 'a\\b\"'`,
	],
	invalid: [
		String.raw`a = 'a\\b'`,
		String.raw`a = {['a\\b']: b}`,
		String.raw`function a() {return'a\\b'}`,
		String.raw`const foo = "foo \\x46";`,
		String.raw`a = 'a\\b\''`,
		String.raw`a = "a\\b\""`,
	],
});

test.snapshot({
	valid: [
		'a = foo`ab`',
		'a = foo().bar`ab`',
		'a = foo.bar()`ab`',
		'a = String["raw"]`ab`',
		'a = foo.raw`ab`',
		'a = String.foo`ab`',
		'a = String.raw`a\\b`',
		'a = String.raw`a\\b`',
		'a = String.raw`a\\b${foo}cd`',
		'a = String.raw`ab${foo}c\\nd`',
		outdent`
			a = String.raw\`a
				b\\c
				de\`
		`,
	],
	invalid: [
		'a = String.raw`abc`',
		'a = String.raw`ab${foo}cd`',
		'a = String.raw`ab"c`',
		'a = String.raw`ab\'c`',
		'a = String.raw`ab\'"c`',
		'a = String.raw`ab\r\nc`',
		outdent`
			a = String.raw\`a
				bc
				de\`
		`,
		outdent`
			a = String.raw\`
			a\${foo}b
			\${bar}cd\`
		`,
	],
});

test.typescript({
	valid: [
		outdent`
			enum Files {
				Foo = "C:\\\\path\\\\to\\\\foo.js",
			}
		`,
		outdent`
			enum Foo {
				"\\\\a\\\\b" = "baz",
			}
		`,
	],
	invalid: [],
});
