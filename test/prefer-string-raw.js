/* eslint-disable no-template-curly-in-string */
import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

// String literal to `String.raw`
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

// `TemplateLiteral` to `String.raw`
test.snapshot({
	valid: [
		// No backslash
		'a = `a`',
		'a = `${foo}`',
		'a = `a${100}b`',

		// Escaped characters other than backslash
		'a = `a\\t${foo.bar}b\\\\c`', // \t
		'a = `${foo}\\\\a${bar}\\``', // \`
		'a = `a\\${`', // \$
		'a = `a$\\{`', // \{
		'a = `${a}\\\'${b}\\\\`', // \'
		'a = `\\"a\\\\b`', // \"

		// Ending with backslash
		'a = `\\\\a${foo}b\\\\${foo}`',

		// Tagged template expression
		'a = String.raw`a\\\\b`',

		// Slash before newline (spread into multiple lines)
		outdent`
			a = \`\\\\a \\
			b\`
		`,
	],
	invalid: [
		'a = `a\\\\b`',
		'function a() {return`a\\\\b${foo}cd`}',
		'a = {[`a\\\\b${foo}cd${foo.bar}e\\\\f`]: b}',
		'a = `a${foo}${foo.bar}b\\\\c`',
		'a = `a\\\\b${"c\\\\d"}e`',
		outdent`
			a = \`\\\\a
			b\`
		`,
		outdent`
			a = \`\\\\a\${foo}
			b\${bar}c
			d\\\\\\\\e\`
		`,
		'a = `a\\\\b${ foo /* bar */}c\\\\d`',
		'a = `a\\\\b${ foo + bar }`',
		'a = `${ foo .bar }a\\\\b`',
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
