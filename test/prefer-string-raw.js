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
		// eslint-disable-next-line no-template-curly-in-string
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
