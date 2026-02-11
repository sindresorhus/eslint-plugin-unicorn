/* eslint-disable no-template-curly-in-string */
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const TEST_STRING = String.raw`a\\b`;

// String literal to `String.raw`
test.snapshot({
	valid: [
		String.raw`a = '\''`,
		outdent`
			a = "\\\\a \\
				b"
		`,
		String.raw`a = 'a\\b\u{51}c'`,
		'a = "a\\\\b`"',
		'a = "a\\\\b${foo}"',
		String.raw`a = '\\'`,
		String.raw`a = 'a\\b\"'`,
	],
	invalid: [
		`TEST_STRING = '${TEST_STRING}';`,
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

// No unnecessary `String.raw`
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
		outdent`
			a = String.raw
				// Comment
				\`ab\\c\`
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
		outdent`
			a
			String.raw\`abc\`
		`,
		// ASI
		outdent`
			a
			String.raw\`a\${b}\`
		`,
		outdent`
			a = String.raw
			// Comment
			\`ab
			c\`
		`,
		outdent`
			a = String.raw  /* comment */  \`ab
			c\`
		`,
		outdent`
			function foo() {
				return String.raw\`abc\`
			}
		`,
		outdent`
			function foo() {
				return String.raw
						// comment
						\`abc\`
			}
		`,
		outdent`
			function foo() {
				return (String.raw
						// already parenthesized
						\`abc\`)
			}
		`,
		outdent`
			function foo() {
				return (String.raw) // remove parenthesis
						\`abc\`
			}
		`,
	],
});

// Restricted places
const keyTestsComputedIsInvalid = [
	// Object property key
	`({ '${TEST_STRING}': 1 })`,
	// Class members key
	`class C { '${TEST_STRING}' = 1 }`,
	`class C { '${TEST_STRING}'(){} }`,
	`class C { accessor '${TEST_STRING}' = 1 }`,
];
const keyTestsComputedIsValid = [
	// Abstract class members key
	`abstract class C { abstract '${TEST_STRING}' }`,
	`abstract class C { abstract '${TEST_STRING}'() }`,
	`abstract class C { abstract accessor '${TEST_STRING}' }`,
	// Interface members key
	`interface I { '${TEST_STRING}' }`,
];
const toComputed = code => code.replace(`'${TEST_STRING}'`, `['${TEST_STRING}']`);
test.snapshot({
	testerOptions: {
		languageOptions: {parser: parsers.typescript},
	},
	valid: [
		// Directive
		`'${TEST_STRING}';`,
		// Module source
		`import '${TEST_STRING}';`,
		`export {} from '${TEST_STRING}';`,
		`export * from '${TEST_STRING}';`,
		// Import attribute key
		`import 'm' with {'${TEST_STRING}': 'v'};`,
		`export {} from 'm' with {'${TEST_STRING}': 'v'};`,
		// Import attribute value
		`import 'm' with {k: '${TEST_STRING}'};`,
		`export {} from 'm' with {k: '${TEST_STRING}'};`,
		// Module specifier
		`import {'${TEST_STRING}' as s} from 'm';`,
		`export {'${TEST_STRING}' as s} from 'm';`,
		`export {s as '${TEST_STRING}'} from 'm';`,
		`export * as '${TEST_STRING}' from 'm';`,

		// JSX attribute value
		{
			code: `<Component attribute='${TEST_STRING}' />`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		// (TypeScript) Enum member key and value
		`enum E {'${TEST_STRING}' = 1}`,
		`enum E {K = '${TEST_STRING}'}`,
		// (TypeScript) Module declaration
		`module '${TEST_STRING}' {}`,
		// (TypeScript) CommonJS module reference
		`import type T = require('${TEST_STRING}');`,
		// (TypeScript) Literal type
		`type T = '${TEST_STRING}';`,
		// (TypeScript) Import type
		`type T = import('${TEST_STRING}');`,
		...keyTestsComputedIsInvalid,
		...keyTestsComputedIsValid.flatMap(code => [code, toComputed(code)]),
		`expect(foo).toMatchInlineSnapshot('${TEST_STRING}')`,
		`expect(foo).toMatchInlineSnapshot(\`${TEST_STRING}\`)`,
	],
	invalid: [
		...keyTestsComputedIsInvalid.map(code => toComputed(code)),
		`expect('${TEST_STRING}').toMatchInlineSnapshot("")`,
		`expect(\`${TEST_STRING}\`).toMatchInlineSnapshot(\`\`)`,
	],
});

